async function test() {
  const loginUrl = "https://api.cne.cl/api/login";
  const body = new URLSearchParams();
  body.append('email', 'info@vorianglobal.com');
  body.append('password', 'Da10vi9d.');
  const resLogin = await fetch(loginUrl, { method: 'POST', body, headers: {'Content-Type': 'application/x-www-form-urlencoded'} });
  const loginData = await resLogin.json();
  const token = loginData.token;

  const myHeaders = new Headers();
  myHeaders.append("Authorization", `Bearer ${token}`);
  const resPrices = await fetch("https://api.cne.cl/api/ea/precio/combustibleliquido", { method: 'GET', headers: myHeaders });
  const pricesData = await resPrices.json();
  
  const dieselPrices = pricesData.data
      .filter((d) => d.tipo_combustible === "petroleo_diesel" && d.region_cod === 13)
      .map((d) => {
          const num = parseFloat(d.precio_por_litro.replace(',', '.'));
          if (isNaN(num)) console.log("Found NaN for:", d);
          return num;
      });
      
  const averagePrice = dieselPrices.reduce((a, b) => a + b, 0) / dieselPrices.length;
  console.log("Length:", dieselPrices.length);
  console.log("Average:", averagePrice);
  console.log("Math.round:", Math.round(averagePrice));
  
  const mostRecent = pricesData.data
      .filter((d) => d.tipo_combustible === "petroleo_diesel" && d.region_cod === 13)
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];
      
  console.log("Most recent:", mostRecent);
}
test();
