/* ========================================
   swipe.js — 横向滑动翻页（修复版）
======================================== */

(function () {
    const track = document.getElementById('pagesTrack');
    const dots = document.querySelectorAll('.page-dots .dot');
    const totalPages = 2;
    let currentPage = 0;
    let startX = 0;
    let diffX = 0;
    let isDragging = false;
    let trackWidth = 0;

    function goToPage(index) {
        currentPage = Math.max(0, Math.min(index, totalPages - 1));
        track.style.transition = 'transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        track.style.transform = `translateX(-${currentPage * 50}%)`;
        // 50% 因为 track 宽度是 200%，每页占 50%
        dots.forEach((d, i) => d.classList.toggle('active', i === currentPage));
    }

    function getTrackWidth() {
        return track.offsetWidth;
    }

    // ===== 触摸 =====
    track.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        isDragging = true;
        trackWidth = getTrackWidth();
        track.style.transition = 'none';
    }, { passive: true });

    track.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        diffX = e.touches[0].clientX - startX;
        const baseOffset = -currentPage * 50;
        const dragOffset = (diffX / (trackWidth / 2)) * 50;
        track.style.transform = `translateX(${baseOffset + dragOffset}%)`;
    }, { passive: true });

    track.addEventListener('touchend', () => {
        isDragging = false;
        if (diffX < -40) {
            goToPage(currentPage + 1);
        } else if (diffX > 40) {
            goToPage(currentPage - 1);
        } else {
            goToPage(currentPage);
        }
        diffX = 0;
    });

    // ===== 鼠标（PC预览） =====
    track.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        isDragging = true;
        trackWidth = getTrackWidth();
        track.style.transition = 'none';
        e.preventDefault();
    });

    track.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        diffX = e.clientX - startX;
        const baseOffset = -currentPage * 50;
        const dragOffset = (diffX / (trackWidth / 2)) * 50;
        track.style.transform = `translateX(${baseOffset + dragOffset}%)`;
    });

    track.addEventListener('mouseup', () => {
        isDragging = false;
        if (diffX < -40) {
            goToPage(currentPage + 1);
        } else if (diffX > 40) {
            goToPage(currentPage - 1);
        } else {
            goToPage(currentPage);
        }
        diffX = 0;
    });

    track.addEventListener('mouseleave', () => {
        if (isDragging) {
            isDragging = false;
            goToPage(currentPage);
            diffX = 0;
        }
    });

    // 点击圆点
    dots.forEach((dot, i) => {
        dot.addEventListener('click', () => goToPage(i));
    });

})();
