let map;

$(document).ready(() => {
  $('.content').load('./pages/today.html');
});

const handleNavigation = (location) => {
  $('.nav__list li').removeClass('active');
  $(`.to-${location}`).addClass('active');
  $('main').load(`./pages/${location}.html`);

  if (location === 'radar') {
    setTimeout(() => {
      initMap();
    }, 1000);
  }
};

const initMap = () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      console.log(position);
      map = new google.maps.Map(document.getElementById('map'), {
        center: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        },
        zoom: 15,
      });
      const marker = new google.maps.Marker({
        position: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        },
        map: map,
      });
      const infoWindow = new google.maps.InfoWindow({
        content: `<small>Temperature: 32&deg;</small>`,
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });
    });
  } else {
    map = new google.maps.Map(document.getElementById('map'), {
      center: { lat: 33, lng: 33 },
      zoom: 8,
    });
  }
};
