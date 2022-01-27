function verify()
  {
    
    var username = document.getElementById("fname");
    var phone = document.getElementById("email");
    var pin = document.getElementById("zip");
    var crd = document.getElementById("cname");
    var c = document.getElementById("cvv");
    if(username.value.trim()=="" || phone.value.trim()=="" || pin.value.trim()==""){
      alert("Please fill billing details");
      return false;
    }
    else if(crd.value.trim()=="" || c.value.trim()==""){
      alert("Please fill card details");
      return false;
    }
    else{
      return true;
    }
  }


  function remove()
  {
    var x=document.getElementById("")
  }