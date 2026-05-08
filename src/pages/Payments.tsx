// Principales cambios en el render de Payments.tsx:
// 1. Estados para filterType ('mensual' | 'acumulado'), selectedYear y selectedMonth.
// 2. Lógica de filtrado dinámico en filteredByDatePayments.
// 3. Tarjetas resumen actualizadas:

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* Tarjeta: Total Cobrado (Filtrado) */}
  <div className="bg-neutral-900 dark:bg-neutral-950 text-white p-8 rounded-3xl shadow-xl flex items-center justify-between border border-transparent dark:border-neutral-800 relative overflow-hidden group">
    <div className="space-y-1 relative z-10">
      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">Total Cobrado</p>
      <h3 className="text-3xl font-black">{totalCollected.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</h3>
      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{filterType === 'mensual' ? `${months[selectedMonth]} ${selectedYear}` : `Año ${selectedYear}`}</p>
    </div>
    <div className="p-4 rounded-2xl bg-green-500/10 text-green-500 relative z-10">
      <TrendingUp size={32} />
    </div>
  </div>

  {/* Tarjeta: Pendiente Actual */}
  <div className="kraken-card p-8 flex items-center justify-between relative overflow-hidden group">
    <div className="space-y-1 relative z-10">
      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">Pendiente de Cobro</p>
      <h3 className="text-3xl font-black text-neutral-900 dark:text-white">{totalPending.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</h3>
      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{filterType === 'mensual' ? `Mes Actual` : `Anual`}</p>
    </div>
    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-500 dark:text-amber-400 relative z-10">
      <TrendingDown size={32} />
    </div>
  </div>

  {/* Tarjeta Histórica: Pendiente Mes Anterior */}
  <div className="kraken-card p-8 border-neutral-100 dark:border-neutral-800 flex items-center justify-between relative overflow-hidden group">
    <div className="space-y-1 relative z-10">
      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">Pendiente {months[prevMonth]}</p>
      <h3 className="text-3xl font-black text-neutral-900 dark:text-white">{prevMonthPending.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</h3>
      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Histórico Mes Anterior</p>
    </div>
    <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 relative z-10">
      <History size={32} />
    </div>
  </div>

  {/* Tarjeta: Facturación Total del Periodo */}
  <div className="bg-[#FF4D00] text-white p-8 rounded-3xl shadow-xl shadow-orange-500/20 flex items-center justify-between relative overflow-hidden group">
    <div className="space-y-1 relative z-10">
      <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em]">Total General</p>
      <h3 className="text-3xl font-black text-white">{(totalCollected + totalPending).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</h3>
      <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Facturación {months[selectedMonth]}</p>
    </div>
    <div className="p-4 rounded-2xl bg-white/10 text-white relative z-10">
      <DollarSign size={32} />
    </div>
  </div>
</div>
