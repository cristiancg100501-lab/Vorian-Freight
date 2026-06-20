async function test() {
  const loginUrl = "https://api.cne.cl/api/login";
  const body = new URLSearchParams();
  body.append('email', 'info@vorianglobal.com');
  body.append('password', 'Da10vi9d.');
  const resLogin = await fetch(loginUrl, { method: 'POST', body, headers: {'Content-Type': 'application/x-www-form-urlencoded'} });
  const loginData = await resLogin.json();
  const token = loginData.token;
  console.log("Token:", token ? "Got token" : "Failed");

  const myHeaders = new Headers();
  myHeaders.append("Authorization", `Bearer ${token}`);
  const resPrices = await fetch("https://api.cne.cl/api/ea/precio/combustibleliquido", { method: 'GET', headers: myHeaders });
  const data = await resPrices.json();
  console.log("Success?", data.success);
  if (data.data && data.data.length > 0) {
     console.log("Sample:", data.data[0]);
     const diesel = data.data.find(d => d.tipo_combustible === "petroleo_diesel" && d.region_cod === 13);
     console.log("Found diesel in RM?", !!diesel);
     if (diesel) console.log(diesel);
  }
}
test();
