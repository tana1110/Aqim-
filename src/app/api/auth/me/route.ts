import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  return Response.json({
    account: user
      ? {
          email: user.email,
          name: user.name === "You" ? null : user.name,
          hasGoogle: !!user.googleSub,
        }
      : null,
  });
}
