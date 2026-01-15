import { Header } from "@/components/marketing/header"
import { Hero } from "@/components/marketing/hero"
import { ProblemSolution } from "@/components/marketing/problem-solution"
import { Features } from "@/components/marketing/features"
import { CTA } from "@/components/marketing/cta"
import { Footer } from "@/components/marketing/footer"

export default function Page() {
  return (
    <div className="relative min-h-screen">
      <Header />
      <main>
        <Hero />
        <ProblemSolution />
        <Features />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
