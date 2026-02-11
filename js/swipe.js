/* ============================================
   swipe.js — 双页横向滑动逻辑
   ============================================ */

(function () {
    var track     = document.getElementById('pagesTrack');
    var dots      = document.querySelectorAll('.page-dots .dot');
    var currentPage = 0;
    var totalPages  = 2;

    var startX    = 0;
    var startY    = 0;
    var diffX     = 0;
    var isDragging = false;
    var isHorizontal = null;

    /** 切换到指定页 */
    function goToPage(index) {
        if (index < 0) index = 0;
        if (index >= totalPages) index = totalPages - 1;
        currentPage = index;
        track.style.transform = 'translateX(-' + (currentPage * 50) + '%)';

        // 更新小圆点
        dots.forEach(function (dot, i) {
            dot.classList.toggle('active', i === currentPage);
        });
    }

    /* ----- 触摸事件 ----- */
    if (e.target.closest('[contenteditable="true"]')) return;
    track.addEventListener('touchstart', function (e) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        diffX = 0;
        isDragging = true;
        isHorizontal = null;
        track.classList.add('dragging');
    }, { passive: true });

    track.addEventListener('touchmove', function (e) {
        if (!isDragging) return;

        var moveX = e.touches[0].clientX;
        var moveY = e.touches[0].clientY;
        diffX = moveX - startX;
        var diffY = moveY - startY;

        // 判断滑动方向（首次移动时）
        if (isHorizontal === null) {
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 8) {
                isHorizontal = true;
            } else if (Math.abs(diffY) > 8) {
                isHorizontal = false;
            }
        }

        if (!isHorizontal) return;

        e.preventDefault();
        var baseOffset = -(currentPage * 50);
        var dragPercent = (diffX / track.parentElement.offsetWidth) * 50;
        track.style.transform = 'translateX(' + (baseOffset + dragPercent) + '%)';
    }, { passive: false });

    track.addEventListener('touchend', function () {
        if (!isDragging) return;
        isDragging = false;
        track.classList.remove('dragging');

        if (isHorizontal && Math.abs(diffX) > 50) {
            if (diffX < 0) {
                goToPage(currentPage + 1);   // 左滑 → 下一页
            } else {
                goToPage(currentPage - 1);   // 右滑 → 上一页
            }
        } else {
            goToPage(currentPage);           // 回弹
        }
    });

    /* ----- 鼠标拖拽（PC端兼容）----- */
    track.addEventListener('mousedown', function (e) {
        startX = e.clientX;
        diffX = 0;
        isDragging = true;
        isHorizontal = true;
        track.classList.add('dragging');
        e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
        if (!isDragging) return;
        diffX = e.clientX - startX;
        var baseOffset = -(currentPage * 50);
        var dragPercent = (diffX / track.parentElement.offsetWidth) * 50;
        track.style.transform = 'translateX(' + (baseOffset + dragPercent) + '%)';
    });

    document.addEventListener('mouseup', function () {
        if (!isDragging) return;
        isDragging = false;
        track.classList.remove('dragging');

        if (Math.abs(diffX) > 50) {
            if (diffX < 0) {
                goToPage(currentPage + 1);
            } else {
                goToPage(currentPage - 1);
            }
        } else {
            goToPage(currentPage);
        }
    });

    /* ----- 点击小圆点切换 ----- */
    dots.forEach(function (dot) {
        dot.addEventListener('click', function () {
            goToPage(parseInt(dot.getAttribute('data-page')));
        });
    });

})();
