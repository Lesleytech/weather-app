let map;

$(document).ready(async () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { data } = await getWeatherInfo(
        position.coords.latitude,
        position.coords.longitude
      );

      localStorage.setItem('local_weather', JSON.stringify(data));
    });
  }

  const { data: nycWeather } = await getWeatherInfo(40.73061, -73.935242);
  localStorage.setItem('nyc_weather', JSON.stringify(nycWeather));

  $('main').load('./pages/today.html', () => {
    const localWeather = JSON.parse(localStorage.getItem('local_weather'));
    displayCurrentWeather(nycWeather);
  });

  let lastScrollTop = 0;
  $(window).scroll(function () {
    const st = $(this).scrollTop();
    if (st > lastScrollTop) {
      // downscroll code
      $('#mobile-nav').css('bottom', '-100px');
      $('header nav').css('top', '-100px');
    } else {
      // upscroll code
      $('#mobile-nav').css('bottom', '0px');
      $('header nav').css('top', '0px');
    }
    lastScrollTop = st;
  });
});

const handleNavigation = (location) => {
  const localWeather = JSON.parse(localStorage.getItem('local_weather'));
  $('main').load(`./pages/${location}.html`, () => {
    $('.nav__list li').removeClass('active');
    $(`.to-${location}`).addClass('active');

    if (location === 'today') {
      displayCurrentWeather(localWeather);
    } else if (location === 'hourly') {
      displayHourlyWeather(localWeather);
    } else if (location === 'days') {
      displayDailyWeather(localWeather);
    } else if (location === 'radar') {
      initMap();
    }
  });
};

const initMap = async () => {
  const {
    timezone,
    lat,
    lon: lng,
    current: { temp, weather, humidity, pressure, sunrise, sunset },
  } =
    JSON.parse(localStorage.getItem('local_weather')) ||
    JSON.parse(localStorage.getItem('nyc_weather'));

  const address = await axios.get(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=AIzaSyAJ4OVmrEfo7iV1Lz0LFQKCzEvjGxS-wCE`
  );

  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat, lng },
    zoom: 15,
  });
  const marker = new google.maps.Marker({
    position: { lat, lng },
    map: map,
  });
  const infoWindow = new google.maps.InfoWindow({
    content: `
      <div class="maps-info-window">
        <address class="address-md">${timezone.split('/').join(' • ')}</address>
        <p>Temperature: ${temp}&deg;c</p>
        <p>Description: ${capitalize(weather[0].description)}</p>
        <p>Humidity: ${humidity}%</p>
        <p>Pressure: ${pressure} hPa</p>
        <p>Sunrise: ${moment.unix(sunrise).local().format('LT')}</p>
        <p>Sunset: ${moment.unix(sunset).local().format('LT')}</p>
      </div>`,
  });

  marker.addListener('click', () => {
    infoWindow.open(map, marker);
  });
};

const getWeatherInfo = async (lat, long) => {
  const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${long}&units=metric&appid=7db76e72ec82a87503505774f91c9b8a`;

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
      .reverse()
      .join(', ')}</address>
    <div class="today-weather">
        <div>
          <h1 id="current-temp">${data.current.temp + '&deg;c'}</h1>
        </div>
        <div>
          <div>
            <img src="https://openweathermap.org/img/wn/${
              data.current.weather[0].icon
            }@2x.png" alt="${data.current.weather[0].description}" width="100">
            <h2 id="current-temp-description">${capitalize(
              data.current.weather[0].description
            )}</h2>
          </div>
        </div>
    </div>`);
};

const displayHourlyWeather = (data) => {
  const today = moment.unix(data.hourly[0].dt).format('dddd, MMMM D');
  $('#hourly-weather-section').html(`
    <div>
      <h1>Hourly Weather</h1> <address> - ${data.timezone
        .split('/')
        .reverse()
        .join(', ')}</address>
      <small class="d-block muted">as of ${moment
        .unix(data.hourly[0].dt)
        .tz(data.timezone)
        .format('hh:00 a z')}</small>
      <h3 class="mt-5">${today}</h3>
    </div>
    <div>
    ${data.hourly
      .map(
        (hour, index) => `<div class="hourly-weather-summary">
        <span>${moment.unix(hour.dt).format('h a')}</span>
        <span>${Math.round(Number(hour.temp))}&deg;</span>
        <span>
            <img src="https://openweathermap.org/img/wn/${
              hour.weather[0].icon
            }@2x.png" alt="${hour.weather[0].description}">
            ${capitalize(hour.weather[0].description)}
        </span>
        <span>
          <span class="material-icons">invert_colors</span>
            ${hour.humidity}%
        </span>
      </div>
      ${
        index < data.hourly.length - 1 &&
        moment.unix(hour.dt).format('dddd, MMMM D') !==
          moment.unix(data.hourly[index + 1].dt).format('dddd, MMMM D')
          ? `<h3>${moment
              .unix(data.hourly[index + 1].dt)
              .format('dddd, MMMM D')}</h3>`
          : ''
      }
      `
      )
      .join('')}
    </div>
  `);
};

const displayDailyWeather = (data) => {
  $('#daily-weather-section').html(`
    <div>
      <h1>Hourly Weather</h1> <address> - ${data.timezone
        .split('/')
        .join(' ')}</address>
      <small class="d-block muted">as of ${moment
        .unix(data.daily[0].dt)
        .tz(data.timezone)
        .format('hh:00 a z')}</small>
    </div>
    <div>
    ${data.daily
      .map(
        (day) => `<div class="daily-weather-summary">
        <h3 class="my-3">${moment.unix(day.dt).format('dddd, MMMM D')}</h3>
        <div>
          <span>Morning</span>
          <span>${Math.round(Number(day.temp.morn))}&deg;</span>
          <span>
              <img src="https://openweathermap.org/img/wn/${
                day.weather[0].icon
              }@2x.png" alt="${day.weather[0].description}">
              ${capitalize(day.weather[0].description)}
          </span>
          <span>
            <span class="material-icons">invert_colors</span>
              ${day.humidity}%
          </span>
        </div>
        <div>
          <span>Day</span>
          <span>${Math.round(Number(day.temp.day))}&deg;</span>
          <span>
              <img src="https://openweathermap.org/img/wn/${
                day.weather[0].icon
              }@2x.png" alt="${day.weather[0].description}">
              ${capitalize(day.weather[0].description)}
          </span>
          <span>
            <span class="material-icons">invert_colors</span>
              ${day.humidity}%
          </span>
        </div>
        <div>
          <span>Evening</span>
          <span>${Math.round(Number(day.temp.eve))}&deg;</span>
          <span>
              <img src="https://openweathermap.org/img/wn/${
                day.weather[0].icon
              }@2x.png" alt="${day.weather[0].description}">
              ${capitalize(day.weather[0].description)}
          </span>
          <span>
            <span class="material-icons">invert_colors</span>
              ${day.humidity}%
          </span>
        </div>
        <div>
          <span>Night</span>
          <span>${Math.round(Number(day.temp.night))}&deg;</span>
          <span>
              <img src="https://openweathermap.org/img/wn/${
                day.weather[0].icon
              }@2x.png" alt="${day.weather[0].description}">
              ${capitalize(day.weather[0].description)}
          </span>
          <span>
            <span class="material-icons">invert_colors</span>
              ${day.humidity}%
          </span>
        </div>
      </div>
      `
      )
      .join('')}
    </div>
  `);
};

function capitalize(str) {
  return str
    .split(' ')
    .map((str) =>
      str
        .split('')
        .map((c, i) => (i === 0 ? c.toUpperCase() : c.toLowerCase()))
        .join('')
    )
    .join(' ');
}
