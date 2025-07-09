import db from "@/lib/db";
import bcrypt from "bcryptjs";
import { emailSchema, passwordSchema } from "@/schema/credentials-schema";
import { NextAuthOptions, Session} from "next-auth";
import { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";


export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? ""
    }),
    Credentials({
      credentials: {
        email: { type: "email"},
        password: { type: "password"}
      },
      async authorize(credentials) {
        if(!credentials || !credentials.email || !credentials.password) {
          return null;
        }

        const emailValidation = emailSchema.safeParse(credentials.email);

        if(!emailValidation.success) {
          throw new Error("Invalid email");
        }

        const passwordValidation = passwordSchema.safeParse(credentials.password);

        if(!passwordValidation.success) {
          throw new Error(passwordValidation.error.issues[0].message);
        }

        try {
          const user = await db.user.findUnique({
            where: {
              email: emailValidation.data
            }
          });

          if(!user) {
            const hashedPassword = await bcrypt.hash(passwordValidation.data, 10);

            const newUser = await db.user.create({
              data: {
                email: emailValidation.data,
                password: hashedPassword,
                provider: "Credentials"
              }
            });
            return newUser;
          }

          if(!user.password) {
            const hashedPassword = await bcrypt.hash(passwordValidation.data, 10);

            const authUser = await db.user.update({
              where: {
                email: emailValidation.data
              },
              data: {
                password: hashedPassword
              }
            });
            return authUser;
          }

          const passwordVerification = await bcrypt.compare(passwordValidation.data, user.password);

          if(!passwordVerification) {
            throw new Error("Invalid password");
          }

          return user;
        } catch (error) {
          if(error instanceof PrismaClientKnownRequestError) {
            throw new Error("Internal server error");
          }
          console.log(error);
          throw error;
        }
      }
    })
  ],
  pages: {
    signIn: "/auth"
  },
  secret: process.env.NEXTAUTH_SECRET ?? "secret",
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, account, profile, user }) {
      if(account && user) {
        token.email = user.email as string;
        token.id = user.id;
      }

      if (account?.provider === "google" && profile) {
        try {
          const dbUser = await db.user.findUnique({
            where: { email: profile.email }
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.email = dbUser.email;
          }
        } catch (error) {
          console.error("Error fetching user in JWT callback:", error);
        }
      }

      return token;
    },

    async session({ session, token } : {
      session: Session,
      token: JWT;
    }) {
      try { 
        if (token.id) {
          session.user.id = token.id as string;
          return session;
        }

        const user = await db.user.findUnique({
          where: {
            email: token.email
          }
        });

        if(user) {
          session.user.id = user.id;
        }
      } catch (error) {
        if(error instanceof PrismaClientKnownRequestError) {
          throw new Error("Internal server error")
        }
        console.log(error);
        throw error;
      }
      return session;
    },

    async signIn({ account, profile}) {
      try {
        if(account?.provider === "google") {
          if(!profile || !profile.email) return false;

          const user = await db.user.findUnique({
            where: {
              email: profile?.email,
            }
          });

          if(!user) {
            await db.user.create({
              data: {
                email: profile.email,
                name: profile.name || undefined,
                provider: "Google"
              }
            });
          }
        }
        return true;
      } catch (error) {
        console.log("Error in signIn callback",error);
        return false;
      }
    }
  }
} satisfies NextAuthOptions;
