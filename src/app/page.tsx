import Image from "next/image";

export default function Home() {
  return (
    <div>
      <main>
        <Image
          src="/kallas-logo.png"
          alt="Next.js logo"
          width={200}
          height={40}
          priority
        />
      </main>
    </div>
  );
}
