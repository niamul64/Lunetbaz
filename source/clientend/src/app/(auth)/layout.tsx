import { Logo } from "@/components/common/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col bg-[radial-gradient(ellipse_at_top,var(--primary-soft),transparent_60%)]">
      <header className="container-page flex h-16 items-center">
        <Logo />
      </header>
      <main className="container-page flex flex-1 items-start justify-center py-6 sm:py-12">{children}</main>
    </div>
  );
}
