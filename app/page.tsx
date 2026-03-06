import { RegistrationForm } from "@/components/registration-form"

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Bienvenido a GymControl</h1>
        <p className="text-muted-foreground">Registrate para acceder a nuestras instalaciones</p>
      </div>
      <RegistrationForm />
    </div>
  )
}
