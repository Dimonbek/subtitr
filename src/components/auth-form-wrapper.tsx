"use client";

import { AuthForm } from "./auth-form";

export function AuthFormWrapper() {
  return (
    <div className="flex w-full justify-center py-6">
      <AuthForm onSuccess={() => window.location.reload()} />
    </div>
  );
}
