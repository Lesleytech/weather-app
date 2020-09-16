let map;
let currentPage = 'today';

$(document).ready(() => {
  // Register service worker if available
  if (navigator.serviceWorker) {
    navigator.serviceWorker.register('./serviceworker.js');
  }

  $('main').load('./pages/today.html', async () => {
    const localWeather = JSON.parse(
      localStorage.getItem('local_weather_current')
    );

    let nycWeather;
    try {
      nycWeather = await getNycWeather();
    } catch (err) {
      nycWeather = JSON.parse(localStorage.getItem('nyc_weather'));
    } finally {
      const searches = JSON.parse(localStorage.getItem('recent_search'));
      const lastSearch = searches ? searches[searches.length - 1] : null;

      if (localWeather) {
        displayCurrentWeather(localWeather);
      } else if (lastSearch) {
        displayCurrentWeather(lastSearch.city_weather_current);
      } else {
        displayCurrentWeather(nycWeather.nyc_weather_current);
      }
    }
  });

  $('#search-form').submit(async (e) => {
    e.preventDefault();
    const city = $('#search-form input').val().trim().toLowerCase();
    if (!navigator.onLine) {
      const searches = JSON.parse(localStorage.getItem('recent_search'));
      const index = searches.findIndex(
        (search) => search.city_weather_current.name.toLowerCase() === city
      );

      if (index !== -1) {
        saveSearchLocally({
          city_weather: searches[index].city_weather,
          city_weather_current: searches[index].city_weather_current,
        });

        if (currentPage === 'today') {
          displayCurrentWeather(searches[index].city_weather_current);
        } else if (currentPage === 'hourly') {
          displayHourlyWeather(searches[index].city_weather);
        } else if (currentPage === 'days') {
          displayDailyWeather(searches[index].city_weather);
        } else if (currentPage === 'radar') {
        }
      } else {
        showSnack('Only recent searches are available when offline');
      }
    } else {
      try {
        const { data: city_weather_current } = await getWeatherInfoByCity(city);
        const { data: city_weather } = await getWeatherInfo(
          city_weather_current.coord.lat,
          city_weather_current.coord.lon,
          'onecall'
        );
        const {
          data: { timezone },
        } = await getTimeZone(
          city_weather_current.coord.lat,
          city_weather_current.coord.lon
        );

        city_weather_current.timezone = timezone;
        city_weather.location = `${city_weather_current.name}, ${city_weather_current.sys.country}`;
        saveSearchLocally({ city_weather, city_weather_current });

        if (currentPage === 'today') {
          displayCurrentWeather(city_weather_current);
        } else if (currentPage === 'hourly') {
          displayHourlyWeather(city_weather);
        } else if (currentPage === 'days') {
          displayDailyWeather(city_weather);
        } else if (currentPage === 'radar') {
          initMap(city_weather_current);
        }
      } catch (err) {
        showSnack('City not found');
      }
    }
  });
});

const handleNavigation = (location) => {
  currentPage = location;
  const searches = JSON.parse(localStorage.getItem('recent_search'));
  const lastSearch = searches ? searches[searches.length - 1] : null;

  const nycWeather = JSON.parse(localStorage.getItem('nyc_weather'));

  $('main').load(`./pages/${location}.html`, () => {
    $('.nav__list li').removeClass('active');
    $(`.to-${location}`).addClass('active');

    if (location === 'today') {
      if (lastSearch) {
        displayCurrentWeather(lastSearch.city_weather_current);
      } else {
        displayCurrentWeather(nycWeather.nyc_weather_current);
      }
    } else if (location === 'hourly') {
      if (lastSearch) {
        displayHourlyWeather(lastSearch.city_weather);
      } else {
        displayHourlyWeather(nycWeather.nyc_weather);
      }
    } else if (location === 'days') {
      if (lastSearch) {
        displayDailyWeather(lastSearch.city_weather);
      } else {
        displayDailyWeather(nycWeather.nyc_weather);
      }
    } else if (location === 'radar') {
      if (lastSearch) {
        initMap(lastSearch.city_weather_current);
      } else {
        initMap(nycWeather.nyc_weather_current);
      }
    }
  });
};

const initMap = async ({
  coord: { lat, lon: lng },
  name,
  sys: { country, sunrise, sunset },
  main: { humidity, pressure, temp },
  weather,
}) => {
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
        <address class="address-md">${name}, ${country}</address>
        <p><span>Temperature: </span><span>${temp}&deg;c</span></p>
        <p class="text-capitalize"><span>Description:</span><span> ${
          weather[0].description
        }</span></p>
        <p><span>Humidity:</span> <span>${humidity}%</span></p>
        <p><span>Pressure: </span> <span>${pressure} hPa</span></p>
        <p><span>Sunrise</span> <span>${moment
          .unix(sunrise)
          .local()
          .format('LT')}</span></p>
        <p><span>Sunset</span> <span>${moment
          .unix(sunset)
          .local()
          .format('LT')}</span></p>
      </div>`,
  });

  marker.addListener('click', () => {
    infoWindow.open(map, marker);
  });
};

const getWeatherInfo = async (lat, long, apiLocation) => {
  const url = `https://api.openweathermap.org/data/2.5/${apiLocation}?lat=${lat}&lon=${long}&units=metric&appid=7db76e72ec82a87503505774f91c9b8a`;

  try {
    const response = await axios.get(url);
    return response;
  } catch (error) {}
};

const getWeatherInfoByCity = async (city) => {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=7db76e72ec82a87503505774f91c9b8a`;

  const response = await axios.get(url);
  return response;
};

const getTimeZone = async (lat, long) => {
  const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${long}&exclude=current,minutely,daily,hourly&appid=7db76e72ec82a87503505774f91c9b8a`;
  try {
    const response = await axios.get(url);
    return response;
  } catch (error) {}
};

const displayCurrentWeather = (data) => {
  const today = moment.unix(data.dt).format('dddd, MMMM D');
  $('#today-weather-section').html(`
     <div>
        <h1>Today's Weather</h1>
        <address> - ${data.name}, ${data.sys.country}</address>
        <small class="d-block muted">as of ${moment
          .unix(data.dt)
          .tz(data.timezone.toString())
          .format('hh:mm a z')}</small>
        <h3 class="mt-5">${today}</h3>
      </div>
      <div class="flex-column flex-sm-row">
        <h1>${data.main.temp}&deg;c</h1>
        <div style="flex: 0.65; width: 100%;" class="d-flex justify-content-between align-items-center mt-4 mt-sm-0">
          <div class="d-flex align-items-center flex-column">
            <img src="https://openweathermap.org/img/wn/${
              data.weather[0].icon
            }@2x.png" alt="${data.weather[0].description}" width="100">
            <small class="text-capitalize" style="font-weight: 500;">${
              data.weather[0].description
            }</small>
          </div>
          <div class="text-center">
            <div class="d-flex align-items-center">
              <span style="font-weight: 500;">Humidity</span>
            </div>
            <h1>${data.main.humidity}%</h1>
          </div>
        </div>
      </div>`);
};

const displayHourlyWeather = (data) => {
  const today = moment.unix(data.hourly[0].dt).format('dddd, MMMM D');
  $('#hourly-weather-section').html(`
    <div>
      <h1>Hourly Weather</h1> <address> - ${data.location}</address>
      <small class="d-block muted">as of ${moment
        .unix(data.hourly[0].dt)
        .tz(data.timezone)
        .format('hh:00 a z')}</small>
      <h3 class="mt-5">${today}</h3>
    </div>
    <div>
    ${data.hourly
      .map(
        (hour, index) => `<div class="weather-summary">
        <span class="mr-3 mr-sm-0">${moment.unix(hour.dt).format('h a')}</span>
        <span class="ml-3 ml-sm-0">${Math.round(Number(hour.temp))}&deg;</span>
        <span class="text-capitalize">
            <img src="https://openweathermap.org/img/wn/${
              hour.weather[0].icon
            }@2x.png" alt="${hour.weather[0].description}">
            ${hour.weather[0].description}
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
  const today = moment.unix(data.daily[0].dt).format('dddd, MMMM D');
  $('#daily-weather-section').html(`
    <div>
      <h1>Daily Weather</h1> <address> - ${data.location}</address>
      <small class="d-block muted">as of ${moment
        .unix(data.daily[0].dt)
        .tz(data.timezone)
        .format('hh:00 a z')}</small>
      <h3 class="mt-5">${today}</h3>
    </div>
    <div>
    ${data.daily
      .map(
        (day) => `<div class="weather-summary">
        <span class="mr-5 mr-sm-0">${moment.unix(day.dt).format('ddd D')}</span>
        <span class="mr-3 mr-sm-0" style="min-width: 4.5em;">${Math.round(
          Number(day.temp.max)
        )}&deg<small class="font-weight-normal">/ ${Math.round(
          Number(day.temp.min)
        )}&deg;c</small></span>
        <span class="text-capitalize">
            <img src="https://openweathermap.org/img/wn/${
              day.weather[0].icon
            }@2x.png" alt="${day.weather[0].description}">
            ${day.weather[0].description}
        </span>
        <span>
          <span class="material-icons">invert_colors</span>
            ${day.humidity}%
        </span>
      </div>`
      )
      .join('')}
    </div>
  `);
};

function saveSearchLocally(weather) {
  const searches = JSON.parse(localStorage.getItem('recent_search'));

  if (searches) {
    const index = searches.findIndex(
      (search) =>
        search.city_weather.lat === weather.city_weather.lat &&
        search.city_weather.lon === weather.city_weather.lon
    );

    if (index !== -1) {
      searches.splice(index, 1);
    }
    searches.push(weather);

    localStorage.setItem('recent_search', JSON.stringify(searches));
  } else {
    localStorage.setItem('recent_search', JSON.stringify([weather]));
  }
}

const getNycWeather = async () => {
  const { data: nyc_weather_current } = await getWeatherInfoByCity(
    'New york city'
  );

  const {
    data: { timezone },
  } = await getTimeZone(
    nyc_weather_current.coord.lat,
    nyc_weather_current.coord.lon
  );

  const { data: nyc_weather } = await getWeatherInfo(
    nyc_weather_current.coord.lat,
    nyc_weather_current.coord.lon,
    'onecall'
  );

  nyc_weather_current.timezone = timezone;
  nyc_weather.location = `${nyc_weather_current.name}, ${nyc_weather_current.sys.country}`;

  localStorage.setItem(
    'nyc_weather',
    JSON.stringify({ nyc_weather, nyc_weather_current })
  );

  return { nyc_weather, nyc_weather_current };
};

const closeSnack = (snack) => {
  $(`#${snack}`).css('bottom', '-200px');
  setTimeout(() => {
    $(`#${snack}`).hide();
  }, 300);
};

const getUserLocation = () => {
  closeSnack('use-location-snack');

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { data } = await getWeatherInfo(
        position.coords.latitude,
        position.coords.longitude,
        'onecall'
      );

      const { data: current_weather } = await getWeatherInfo(
        position.coords.latitude,
        position.coords.longitude,
        'weather'
      );

      const {
        data: { timezone },
      } = await getTimeZone(
        current_weather.coord.lat,
        current_weather.coord.lon
      );

      current_weather.timezone = timezone;
      data.location = `${current_weather.name}, ${current_weather.sys.country}`;

      saveSearchLocally({
        city_weather: data,
        city_weather_current: current_weather,
      });

      if (currentPage === 'today') {
        displayCurrentWeather(current_weather);
      } else if (currentPage === 'hourly') {
        displayHourlyWeather(data);
      } else if (currentPage === 'days') {
        displayDailyWeather(data);
      } else if (currentPage === 'radar') {
        initMap(current_weather);
      }
    });
  }
};

const showSnack = (message) => {
  $('#snack').html(`<p>${message}</p>`);
  $('#snack').show();
  $('#snack').css('bottom', '3em');

  setTimeout(() => {
    $('#snack').css('bottom', '-20em');
    setTimeout(() => {
      $('#snack').css('display', 'none');
    }, 300);
  }, 5000);
};
