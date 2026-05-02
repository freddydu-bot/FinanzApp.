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
    const { expenses, incomes, categories, currentMonth, currentYear, userName } = await req.json()
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) throw new Error('Missing GEMINI_API_KEY')

    // Build financial context
    const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount), 0)
    const totalIncomes = incomes.reduce((s: number, i: any) => s + Number(i.amount), 0)
    const balance = totalIncomes - totalExpenses
    const savingsRate = totalIncomes > 0 ? ((totalIncomes - totalExpenses) / totalIncomes * 100).toFixed(1) : 0

    // Group expenses by category
    const byCategory: Record<string, number> = {}
    for (const e of expenses) {
      const cat = e.categories?.name || e.category_id || 'Sin categoría'
      byCategory[cat] = (byCategory[cat] || 0) + Number(e.amount)
    }
    const topCategories = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, amount]) => ({ name, amount, pct: totalExpenses > 0 ? ((amount/totalExpenses)*100).toFixed(1) : 0 }))

    // Expense pattern by day
    const byDay: Record<string, number> = {}
    for (const e of expenses) {
      const day = new Date(e.date + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long' })
      byDay[day] = (byDay[day] || 0) + Number(e.amount)
    }
    const peakDay = Object.entries(byDay).sort((a,b) => b[1]-a[1])[0]?.[0] || 'N/A'

    // Fixed vs variable
    const fixedTotal = expenses.filter((e: any) => e.cost_type === 'fixed').reduce((s: number, e: any) => s + Number(e.amount), 0)
    const variableTotal = expenses.filter((e: any) => e.cost_type === 'variable').reduce((s: number, e: any) => s + Number(e.amount), 0)

    const systemPrompt = `
Eres un Copiloto Financiero Personal de alto nivel, experto en finanzas personales colombianas.
Analiza los datos financieros del usuario y genera un informe de insights accionables, concisos y personalizados.
El usuario se llama: ${userName || 'Usuario'}.
Fecha de análisis: ${currentMonth}/${currentYear}.
Responde ÚNICAMENTE con un JSON válido sin markdown.

DATOS FINANCIEROS:
- Ingresos del mes: $${totalIncomes.toLocaleString('es-CO')} COP
- Gastos del mes: $${totalExpenses.toLocaleString('es-CO')} COP
- Balance neto: $${balance.toLocaleString('es-CO')} COP
- Tasa de ahorro: ${savingsRate}%
- Gastos fijos: $${fixedTotal.toLocaleString('es-CO')} COP
- Gastos variables: $${variableTotal.toLocaleString('es-CO')} COP
- Día de mayor gasto: ${peakDay}
- Gastos por categoría (top): ${JSON.stringify(topCategories)}
- Total transacciones: ${expenses.length}

FORMATO DE SALIDA (JSON estricto):
{
  "score": number (0-100, puntuación de salud financiera),
  "score_label": "Excelente" | "Buena" | "Regular" | "Crítica",
  "score_emoji": "🟢" | "🟡" | "🟠" | "🔴",
  "summary": "string (2-3 oraciones, tono amigable y directo, menciona al usuario por nombre)",
  "insights": [
    {
      "type": "success" | "warning" | "danger" | "tip",
      "icon": "emoji",
      "title": "string (max 8 palabras)",
      "detail": "string (max 25 palabras, concreto con cifras)",
      "action": "string (recomendación accionable, max 15 palabras)"
    }
  ],
  "top_category": { "name": "string", "amount": number, "pct": "string" },
  "savings_tip": "string (consejo específico de ahorro para el mes siguiente, max 30 palabras)",
  "projection": "string (proyección de cierre de mes si sigue el ritmo actual, max 20 palabras)"
}

Genera entre 4 y 6 insights relevantes. Sé honesto pero constructivo. Si no hay datos suficientes, igual genera insights útiles con los datos disponibles.
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

    const data = await response.json()
    if (data.error) throw new Error(data.error.message)

    const result = JSON.parse(data.candidates[0].content.parts[0].text)

    return new Response(JSON.stringify({ ...result, topCategories, fixedTotal, variableTotal, savingsRate, balance, totalIncomes, totalExpenses }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Copilot error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})
