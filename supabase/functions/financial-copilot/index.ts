import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const expenses = body.expenses || []
    const incomes = body.incomes || []
    const currentMonth = body.currentMonth
    const currentYear = body.currentYear
    const userName = body.userName || 'Usuario'

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) throw new Error('Missing GEMINI_API_KEY')

    // Totals
    let totalExpenses = 0
    for (const e of expenses) totalExpenses += Number(e.amount || 0)

    let totalIncomes = 0
    for (const i of incomes) totalIncomes += Number(i.amount || 0)

    const balance = totalIncomes - totalExpenses
    const savingsRate = totalIncomes > 0
      ? ((totalIncomes - totalExpenses) / totalIncomes * 100).toFixed(1)
      : '0.0'

    // Group by category
    const byCategory = {}
    for (const e of expenses) {
      const cat = (e.categories && e.categories.name) ? e.categories.name : 'Sin categoría'
      byCategory[cat] = (byCategory[cat] || 0) + Number(e.amount || 0)
    }

    const topCategories = Object.entries(byCategory)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 8)
      .map(([name, amount]) => ({
        name,
        amount: Number(amount),
        pct: totalExpenses > 0 ? ((Number(amount) / totalExpenses) * 100).toFixed(1) : '0'
      }))

    // Peak day
    const byDay = {}
    for (const e of expenses) {
      const d = new Date(e.date + 'T12:00:00')
      const day = d.toLocaleDateString('es-CO', { weekday: 'long' })
      byDay[day] = (byDay[day] || 0) + Number(e.amount || 0)
    }
    const dayEntries = Object.entries(byDay).sort((a, b) => Number(b[1]) - Number(a[1]))
    const peakDay = dayEntries.length > 0 ? dayEntries[0][0] : 'N/A'

    // Fixed vs variable
    let fixedTotal = 0
    let variableTotal = 0
    for (const e of expenses) {
      if (e.cost_type === 'fixed') fixedTotal += Number(e.amount || 0)
      else variableTotal += Number(e.amount || 0)
    }

    const fmt = (n) => `$${Number(n).toLocaleString('es-CO')} COP`

    const systemPrompt = `
Eres un Copiloto Financiero Personal experto en finanzas personales colombianas.
Analiza los datos financieros y genera un reporte JSON con insights accionables y personalizados.
El usuario se llama: ${userName}.
Mes analizado: ${currentMonth}/${currentYear}.
Responde ÚNICAMENTE con un JSON válido sin markdown ni texto adicional.

DATOS FINANCIEROS:
- Ingresos del mes: ${fmt(totalIncomes)}
- Gastos del mes: ${fmt(totalExpenses)}
- Balance neto: ${fmt(balance)}
- Tasa de ahorro: ${savingsRate}%
- Gastos fijos: ${fmt(fixedTotal)}
- Gastos variables: ${fmt(variableTotal)}
- Día de mayor gasto: ${peakDay}
- Total transacciones: ${expenses.length}
- Top categorías: ${JSON.stringify(topCategories)}

FORMATO DE SALIDA (JSON estricto, sin markdown):
{
  "score": 75,
  "score_label": "Buena",
  "score_emoji": "🟡",
  "summary": "Hola [nombre], resumen de 2-3 oraciones de tu mes.",
  "insights": [
    {
      "type": "success",
      "icon": "✅",
      "title": "Título corto",
      "detail": "Detalle con cifras concretas en máximo 25 palabras",
      "action": "Acción concreta en máximo 15 palabras"
    }
  ],
  "top_category": { "name": "string", "amount": 0, "pct": "0" },
  "savings_tip": "Consejo de ahorro para el mes siguiente en máximo 30 palabras.",
  "projection": "Proyección de cierre de mes en máximo 20 palabras."
}

Genera entre 4 y 6 insights. score_label debe ser: Excelente (>80), Buena (60-80), Regular (40-60), Crítica (<40).
score_emoji: 🟢 Excelente, 🟡 Buena, 🟠 Regular, 🔴 Crítica.
Si no hay datos suficientes, genera insights basados en los datos disponibles.
`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.3 }
        })
      }
    )

    const geminiData = await response.json()

    if (geminiData.error) {
      throw new Error(geminiData.error.message || 'Gemini API error')
    }

    const resultText = geminiData.candidates[0].content.parts[0].text
    const result = JSON.parse(resultText)

    const output = {
      ...result,
      topCategories,
      fixedTotal,
      variableTotal,
      savingsRate,
      balance,
      totalIncomes,
      totalExpenses
    }

    return new Response(JSON.stringify(output), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Copilot error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
