"use client";

import CustomerAppointments from "@/components/public/CustomerAppointments";

export default function AgendamentosPublicosPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto w-full max-w-lg">
        <CustomerAppointments readQueryParams />
      </div>
    </main>
  );
}
