const STEPS = [
  {
    number: "01",
    title: "Esplora",
    description:
      "Sfoglia il catalogo per categoria, nazione o produttore. Ogni prodotto ha una storia — leggila prima di acquistare.",
  },
  {
    number: "02",
    title: "Ordina",
    description:
      "Acquista B2C o accedi come Chef Pro per prezzi e quantità all'ingrosso. Pagamento sicuro, checkout in pochi secondi.",
  },
  {
    number: "03",
    title: "Ricevi",
    description:
      "Ogni prodotto arriva direttamente dal suo produttore. Pacchi separati, ciascuno una scoperta.",
  },
]

export function HomeHowItWorksSection() {
  return (
    <section className="w-full bg-tertiary text-tertiary px-4 lg:px-8 py-12 lg:py-16">
      <div className="mb-10">
        <h2 className="heading-lg uppercase tracking-tight">Come funziona</h2>
        <p className="mt-2 text-md text-tertiary/70">
          Semplice per chi compra. Potente per chi produce.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-0 md:grid-cols-3">
        {STEPS.map((step, idx) => (
          <div
            key={step.number}
            className={`py-8 pr-8 ${idx < STEPS.length - 1 ? "md:border-r border-secondary" : ""} ${idx > 0 ? "md:pl-8" : ""}`}
          >
            <span className="display-sm font-medium text-tertiary/20 leading-none block mb-4">
              {step.number}
            </span>
            <h3 className="heading-md uppercase tracking-tight mb-3">
              {step.title}
            </h3>
            <p className="text-md text-tertiary/70 leading-relaxed">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
