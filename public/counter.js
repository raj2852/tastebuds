var count = (function() {
	var counter = 0;
	return function(){return counter +=1;}
})();

function display(){
	document.getElementById("count").innerHTML = count();
}