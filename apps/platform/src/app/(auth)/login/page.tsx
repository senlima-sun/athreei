import { AuthLayout } from "@/components/auth/auth-layout";
import { LoginForm } from "@/components/auth/login-form";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

export default function LoginPage() {
  return (
    <AuthLayout
      title="Sign in to your account"
      description="Welcome back! Please enter your details."
    >
      <OAuthButtons />
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or continue with</span>
        </div>
      </div>
      <LoginForm />
    </AuthLayout>
  );
}
