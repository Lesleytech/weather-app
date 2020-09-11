let map;

$(document).ready(() => {
  DarkReader.enable({
    brightness: 100,
    contrast: 90,
    sepia: 10,
  });

  $('main').load('./pages/today.html', () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { data } = await getWeatherInfo(
          position.coords.latitude,
          position.coords.latitude,
          ['minutely', 'hourly', 'daily']
        );

        displayCurrentWeather(data);
        localStorage.setItem('current_weather', JSON.stringify(data));
      });
    } else {
      getWeatherInfo(33.441792, 94.037689);
    }
  });
});

const handleNavigation = (location) => {
  $('.nav__list li').removeClass('active');
  $(`.to-${location}`).addClass('active');
  $('main').load(`./pages/${location}.html`, () => {
    if (location === 'today') {
      displayCurrentWeather(
        JSON.parse(localStorage.getItem('current_weather'))
      );
    }
    if (location === 'radar') {
      initMap();
    }
  });
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

const getWeatherInfo = async (lat, long, exclude) => {
  const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${long}&exclude=${exclude.join(
    ','
  )}&units=metric&appid=7db76e72ec82a87503505774f91c9b8a`;

  try {
    const response = await axios.get(url);
    return response;
  } catch (error) {
    console.error(error);
  }
};

const displayCurrentWeather = (data) => {
  $('#today-weather-section').html(`
    <address class="address-md" id="current-location">${data.timezone
      .split('/')
      .join(' • ')}</address>
    <div class="today-weather">
        <div>
          <h1 id="current-temp">${data.current.temp + '&deg;c'}</h1>
        </div>
        <div>
          <div>
            <img src="./assets/weather_sunny.svg" alt="Sunny weather" width="100">
            <h2 id="current-temp-description">${data.current.weather[0].description
              .split('')
              .map((x, i) => (i === 0 ? x.toUpperCase() : x.toLowerCase()))
              .join('')}</h2>
          </div>
        </div>
    </div>`);
};
