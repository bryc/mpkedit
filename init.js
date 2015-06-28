// Execute after the page finishes loading.
window.addEventListener("load", function()
{
    MPKEditor.doUpdate();

    document.addEventListener("keydown", function(event)
	{
    	event.preventDefault();
    	if (event.ctrlKey)
    	{ 
    	    var y = document.querySelectorAll(".fa-download");
    	    for(var i=0; i < y.length; i++)
    	    {
    	    	y[i].style.color = "#C00";
    	    }
    	}

	}, false);
    document.addEventListener("keyup", function(event)
	{
    	event.preventDefault();
    	if (!event.ctrlKey)
    	{ 
    	    var y = document.querySelectorAll(".fa-download");
    	   console.log(111111111)
    	    for(var i=0; i < y.length; i++)
    	    {
    	    	y[i].style.color = "";
    	    }
    	}
	}, false);

});