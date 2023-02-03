import "@/style/global.css"
import { TopBar } from "./TopBar"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html className="dark">
      <head />
      <body className="bg-white dark:bg-zinc-900 dark:text-white h-screen flex flex-col">
        <TopBar />
        <main className="flex flex-1 flex-col">
          {children}
        </main>
        </body>
    </html>
  )
}
