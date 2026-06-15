// careplans II
$(document).ready(function(){
	setCircle7Position();
	updateBarriersCircle();
	setComingSoonLeftBoxHeight();

	if ($.fn.popover) { $('[data-toggle="popover"]').popover(); } // popovers handled by CarePlansPopovers (no Bootstrap JS)

	$(".part.two .mobile .carousel.mobile .carousel-inner .item .score").each(function() {
		$(this).css({
			width: $(this).attr("data")+"%"
		});
	});

	$("#carousel-barriers .carousel-indicators li").click(function(event) {
		/* Act on the event */
		$(".carousel-indicators li").removeClass('active');
		$(this).addClass('active');
		updateBarriersCircle();
	});
	$("#carousel-barriers .control.right").click(function(event) {
		/* Act on the event */
		var index = $("#carousel-barriers .item.active").index();
		if(index == 5) {
			index = 1;
		}
		else {
			index = index + 2;
		}
		$(".carousel-indicators li").removeClass('active');
		$(".carousel-indicators li:nth-child("+index+")").addClass('active');
		updateBarriersCircle();
	});
	$("#carousel-barriers .control.left").click(function(event) {
		/* Act on the event */
		var index = $("#carousel-barriers .item.active").index();
		if(index == 0) {
			index = 6;
		}
		else {
			index = index;
		}
		$(".carousel-indicators li").removeClass('active');
		$(".carousel-indicators li:nth-child("+index+")").addClass('active');
		updateBarriersCircle();
	});


	
});

$(window).resize(function(event) {
	/* Act on the event */
	var processBox7Height = $(".process-box7").height() + 25 + "px";
	$(".circle7").css("bottom","calc(1% + "+processBox7Height+")");

	setComingSoonLeftBoxHeight();
});

function setCircle7Position() {
	var processBox7Height = $(".process-box7").height() + 25 + "px";
	$(".circle7").css("bottom","calc(1% + "+processBox7Height+")");
}

function updateBarriersCircle() {
	$("#carousel-barriers .carousel-indicators li").each(function(index, el) {
		if($(this).hasClass('active')){
			$(this).find("img").attr("src","/images/features/careplans/part2/circle_desktop.png");
		}
		else {
			$(this).find("img").attr("src","/images/features/careplans/part2/circle_desktop_active.png");
		}
	});
}

function setComingSoonLeftBoxHeight() {
	var boxHeight = $(".part.four .coming-soon-ii.desktop a:last-child").height();
	var contentHeight = $(".part.four .coming-soon-ii.desktop a:not(:last-child) .coming-soon-content").height();
	var imageHeight = boxHeight - contentHeight - 20;
	console.log(imageHeight); 
	$(".part.four .coming-soon-ii.desktop a:not(:last-child) img:last-child").width(imageHeight);
}