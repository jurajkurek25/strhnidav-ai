import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4">
      <h1 className="text-2xl font-bold">Prihlásenie</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Pošleme ti odkaz na prihlásenie – bez hesla.
      </p>
      {error && <p className="mt-4 text-sm text-red-400">Odkaz je neplatný alebo vypršal.</p>}
      <LoginForm next={next ?? "/dashboard"} />
    </main>
  );
}
