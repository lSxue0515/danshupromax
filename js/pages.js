/* ============================================
   蛋薯机 DanShu Pro — pages.js
   适配 pages-wrapper 一层结构
   ============================================ */

(function () {
    var wrapper, dots;
    var current = 0, total = 2;
    var startX = 0, startY = 0, moveX = 0;
    var isDragging = false, isScrolling = null;
    var wrapperWidth = 0;

    function init() {
        wrapper = document.getElementById('pagesWrapper');
        dots = document.querySelectorAll('.page-dots .dot');

        if (!wrapper) {
            console.error('[pages] 找不到 #pagesWrapper');
            return;
        }

        wrapper.addEventListener('touchstart', onTouchStart, { passive: true });
        wrapper.addEventListener('touchmove', onTouchMove, { passive: false });
        wrapper.addEventListener('touchend', onEnd);

        wrapper.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        dots.forEach(function (d) {
            d.addEventListener('click', function () {
                goTo(parseInt(d.dataset.page));
            });
        });

        wrapper.style.transform = 'translateX(0%)';
        updateDots();
        console.log('[pages] ✅ 初始化完成');
    }

    function onTouchStart(e) {
        if (shouldIgnore(e)) return;
        isDragging = true;
        isScrolling = null;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        moveX = 0;
        wrapperWidth = wrapper.offsetWidth;
        wrapper.style.transition = 'none';
    }

    function onTouchMove(e) {
        if (!isDragging) return;
        var dx = e.touches[0].clientX - startX;
        var dy = e.touches[0].clientY - startY;
        if (isScrolling === null) {
            isScrolling = Math.abs(dy) > Math.abs(dx);
        }
        if (isScrolling) return;
        if (e.cancelable) e.preventDefault();

        moveX = dx;
        var move = moveX;
        if (current === 0 && move > 0) move *= 0.3;
        if (current === total - 1 && move < 0) move *= 0.3;
        var pct = (-current * 100) + (move / wrapperWidth * 100);
        wrapper.style.transform = 'translateX(' + pct + '%)';
    }

    function onEnd() {
        if (!isDragging) return;
        isDragging = false;
        if (isScrolling) return;

        var threshold = wrapperWidth * 0.2;
        if (moveX < -threshold && current < total - 1) {
            current++;
        } else if (moveX > threshold && current > 0) {
            current--;
        }
        goTo(current);
    }

    var mouseDown = false, mouseStartX = 0, mouseDelta = 0;

    function onMouseDown(e) {
        if (shouldIgnore(e)) return;
        mouseDown = true;
        mouseStartX = e.clientX;
        mouseDelta = 0;
        wrapperWidth = wrapper.offsetWidth;
        wrapper.style.transition = 'none';
        e.preventDefault();
    }

    function onMouseMove(e) {
        if (!mouseDown) return;
        mouseDelta = e.clientX - mouseStartX;
        var move = mouseDelta;
        if (current === 0 && move > 0) move *= 0.3;
        if (current === total - 1 && move < 0) move *= 0.3;
        var pct = (-current * 100) + (move / wrapperWidth * 100);
        wrapper.style.transform = 'translateX(' + pct + '%)';
    }

    function onMouseUp() {
        if (!mouseDown) return;
        mouseDown = false;
        var threshold = wrapperWidth * 0.2;
        if (mouseDelta < -threshold && current < total - 1) {
            current++;
        } else if (mouseDelta > threshold && current > 0) {
            current--;
        }
        goTo(current);
    }

    function goTo(page) {
        current = page;
        wrapper.style.transition = 'transform 0.35s cubic-bezier(.25,.46,.45,.94)';
        wrapper.style.transform = 'translateX(-' + (current * 100) + '%)';
        updateDots();
    }

    function updateDots() {
        dots.forEach(function (d, i) {
            d.classList.toggle('active', i === current);
        });
    }

    function shouldIgnore(e) {
        var tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
        if (e.target.closest && e.target.closest('[contenteditable="true"]')) return true;
        return false;
    }

    document.addEventListener('DOMContentLoaded', init);
})();
