function updateCountdown() {
    var dateStr = document.getElementById('displayDate').textContent;
    var startDate = new Date(dateStr);
    var today = new Date();
    startDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    var diffDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    document.getElementById('displayDays').innerHTML = diffDays + '<span>天</span>';
}
updateCountdown();
setInterval(updateCountdown, 60000);

function openCountdownApp() {
    console.log('打开纪念日设置');
}
