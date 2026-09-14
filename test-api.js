fetch("http://localhost:3000/api/v1/accounts").then(res => { console.log(res.status); return res.text(); }).then(text => console.log(text.substring(0, 100)));
