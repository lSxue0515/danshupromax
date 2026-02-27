/* ========================================
   swipe.js — 同步小圆点
   翻页靠 CSS scroll-snap，这里只管圆点
======================================== */

(function () {
    var viewport = document.getElementById('swipeViewport');
    var dots = document.querySelectorAll('#pageDots .dot');

    function updateDots() {
        var scrollLeft = viewport.scrollLeft;
        var pageWidth = viewport.offsetWidth;
        var currentPage = Math.round(scrollLeft / pageWidth);

        for (var i = 0; i < dots.length; i++) {
            if (i === currentPage) {
                dots[i].classList.add('active');
            } else {
                dots[i].classList.remove('active');
            }
        }
    }

    viewport.addEventListener('scroll', updateDots);

    // 点击圆点跳转
    for (var i = 0; i < dots.length; i++) {
        (function (index) {
            dots[index].addEventListener('click', function () {
                viewport.scrollTo({
                    left: viewport.offsetWidth * index,
                    behavior: 'smooth'
                });
            });
        })(i);
    }
})();
