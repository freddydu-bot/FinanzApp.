async function listModels() {
  const apiKey = 'AIzaSyCxBo9jZWhTKw5TRJTGsg_h_0j7VZcdfzk';
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
listModels();
