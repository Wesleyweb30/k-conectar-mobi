import Image from "next/image";

export default function Home() {
  return (
    <div>
      <main>
        <Image
          className="dark:invert"
          src="/logo-remove-bg.png"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <h1>Home</h1>
      </main>
    </div>
  );
}
