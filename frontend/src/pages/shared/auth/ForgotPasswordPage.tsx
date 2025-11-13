import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Car } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setIsSubmitted(true);
      setSubmitting(false);
    }, 600);
  }

  return (
    <div className="min-h-screen bg-card flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Car className="h-8 w-8 text-[#1558E9]" />
          <h1 className="text-2xl font-bold text-[#1558E9]">
            Reservas Corporativas
          </h1>
        </div>

        <Card className="bg-card shadow-xl">
          <CardHeader className="text-center pb-6 pt-8">
            <h2 className="text-xl font-semibold text-[#111111]">
              Forgot your Password?
            </h2>
          </CardHeader>

          <CardContent className="px-8 pb-8">
            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-[#666666] mb-2"
                  >
                    Enter your e-mail address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-12 border-[#B3BDC9] focus:border-[#1558E9] focus:ring-[#1558E9]"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-12 bg-[#1558E9] hover:bg-[#1558E9]/90 text-white font-medium rounded-full"
                >
                  {submitting ? "Sending..." : "Continue"}
                </Button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <p className="text-sm text-[#666666]">
                  An email has been sent to{" "}
                  <span className="font-medium">{email}</span> with instructions
                  for resetting your password.
                </p>
              </div>
            )}

            <div className="text-center mt-4">
              <Link
                to="/login"
                className="text-sm text-[#666666] hover:underline"
              >
                Back to Login
              </Link>
            </div>

            <div className="mt-8 pt-6 border-t border-border">
              <div className="text-center">
                <p className="text-sm font-medium text-[#666666] mb-2">
                  Need Help?
                </p>
                <Link
                  to="/support"
                  className="text-sm text-[#666666] hover:underline"
                >
                  Contact our Support
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
