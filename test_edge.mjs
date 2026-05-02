async function test() {
  try {
    const res = await fetch('https://ghfjovbjmafvqtzquwqw.supabase.co/functions/v1/process-transaction', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoZmpvdmJqbWFmdnF0enF1d3F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMTc5ODEsImV4cCI6MjA5MTU5Mzk4MX0.28DZG4fhEVceaO8eekoEYNc39kmZkgph8is-LMk1UWE',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: 'gasté 8000 en transporte',
        categories: ['transporte', 'comida']
      })
    });
    const text = await res.text();
    console.log('STATUS:', res.status);
    console.log('RESPONSE:', text);
  } catch (e) {
    console.error(e);
  }
}
test();
