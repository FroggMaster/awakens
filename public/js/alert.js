// request permission on page load
document.addEventListener('DOMContentLoaded', function () {
  if (Notification.permission !== "granted")
    Notification.requestPermission();
});

function general-message() {
  if (!Notification) {
    alert('Desktop notifications not available in your browser. Try Chromium.'); 
    return;
  }

  if (Notification.permission !== "granted")
    Notification.requestPermission();
  else {
    var notification = new Notification('New Message', {
      icon: 'https://camo.githubusercontent.com/cb2b27f7e00a4fb9003e656f3b5fbd8c305f5149/687474703a2f2f692e696d6775722e636f6d2f677333696f684d2e6a7067',
      body: user.nick + ' has joined ',
    });

    notification.onclick = function () {
      window.open("#");      
    };
    
  }

}
