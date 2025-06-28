class MobileWeatherApp {
  constructor() {
    this.weatherApiKey = "3cee5ebd1e389e41f87cd6a4019c98d1"
    this.currentUnit = "metric"
    this.currentWeatherData = null
    this.forecastData = null
    this.currentLocation = null
    this.searchTimeout = null
    this.theme = localStorage.getItem("weather-theme") || "light"

    this.initializeApp()
  }

  async initializeApp() {
    try {
      this.initializeElements()
      this.bindEvents()
      this.applyTheme()
      this.setupMobileOptimizations()
      await this.loadInitialWeather()
    } catch (error) {
      console.error("Failed to initialize app:", error)
      this.showError("Failed to load the app. Please refresh.")
    }
  }

  initializeElements() {
    // Navigation
    this.locationBtn = document.getElementById("locationBtn")
    this.themeToggle = document.getElementById("themeToggle")

    // Search
    this.cityInput = document.getElementById("cityInput")
    this.clearSearch = document.getElementById("clearSearch")
    this.searchBtn = document.getElementById("searchBtn")
    this.searchSuggestions = document.getElementById("searchSuggestions")
    this.suggestionsList = document.getElementById("suggestionsList")

    // States
    this.loadingState = document.getElementById("loadingState")
    this.errorState = document.getElementById("errorState")
    this.errorMessage = document.getElementById("errorMessage")
    this.retryBtn = document.getElementById("retryBtn")
    this.weatherContent = document.getElementById("weatherContent")

    // Weather display
    this.currentCity = document.getElementById("currentCity")
    this.currentCountry = document.getElementById("currentCountry")
    this.currentDate = document.getElementById("currentDate")
    this.currentTemp = document.getElementById("currentTemp")
    this.currentWeatherIcon = document.getElementById("currentWeatherIcon")
    this.currentCondition = document.getElementById("currentCondition")
    this.conditionDescription = document.getElementById("conditionDescription")
    this.feelsLike = document.getElementById("feelsLike")
    this.tempHigh = document.getElementById("tempHigh")
    this.tempLow = document.getElementById("tempLow")

    // Units
    this.celsiusBtn = document.getElementById("celsiusBtn")
    this.fahrenheitBtn = document.getElementById("fahrenheitBtn")

    // Details
    this.visibility = document.getElementById("visibility")
    this.humidity = document.getElementById("humidity")
    this.windSpeed = document.getElementById("windSpeed")
    this.pressure = document.getElementById("pressure")
    this.uvIndex = document.getElementById("uvIndex")
    this.precipitation = document.getElementById("precipitation")

    // Forecasts
    this.hourlyForecast = document.getElementById("hourlyForecast")
    this.weeklyForecast = document.getElementById("weeklyForecast")
  }

  bindEvents() {
    // Navigation
    this.locationBtn?.addEventListener("click", () => this.getCurrentLocation())
    this.themeToggle?.addEventListener("click", () => this.toggleTheme())

    // Search
    this.cityInput?.addEventListener("input", (e) => this.handleSearchInput(e))
    this.cityInput?.addEventListener("keydown", (e) => this.handleSearchKeydown(e))
    this.cityInput?.addEventListener("focus", () => this.handleSearchFocus())
    this.cityInput?.addEventListener("blur", () => this.handleSearchBlur())
    this.clearSearch?.addEventListener("click", () => this.clearSearchInput())
    this.searchBtn?.addEventListener("click", () => this.handleSearch())

    // Error retry
    this.retryBtn?.addEventListener("click", () => this.retryWeatherLoad())

    // Units
    this.celsiusBtn?.addEventListener("click", () => this.changeUnit("metric"))
    this.fahrenheitBtn?.addEventListener("click", () => this.changeUnit("imperial"))

    // Global events
    document.addEventListener("click", (e) => this.handleGlobalClick(e))
    window.addEventListener("resize", () => this.handleResize())
    window.addEventListener("orientationchange", () => this.handleOrientationChange())

    // Touch events
    this.setupTouchEvents()
  }

  setupMobileOptimizations() {
    // Prevent zoom on input focus
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      const viewport = document.querySelector('meta[name="viewport"]')
      if (viewport) {
        viewport.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
      }
    }

    // Add touch class for better touch interactions
    document.body.classList.add("touch-device")

    // Optimize scroll behavior
    document.documentElement.style.scrollBehavior = "smooth"
  }

  setupTouchEvents() {
    // Touch events for hourly forecast scrolling
    let touchStartX = 0
    let touchStartTime = 0

    this.hourlyForecast?.addEventListener("touchstart", (e) => {
      touchStartX = e.touches[0].clientX
      touchStartTime = Date.now()
    })

    this.hourlyForecast?.addEventListener("touchend", (e) => {
      const touchEndX = e.changedTouches[0].clientX
      const touchDiff = touchStartX - touchEndX
      const touchDuration = Date.now() - touchStartTime

      // Swipe detection
      if (touchDuration < 300 && Math.abs(touchDiff) > 50) {
        if (touchDiff > 0) {
          this.scrollHourlyForecast("next")
        } else {
          this.scrollHourlyForecast("prev")
        }
      }
    })
  }

  handleResize() {
    // Handle mobile orientation changes
    setTimeout(() => {
      this.adjustMobileLayout()
    }, 100)
  }

  handleOrientationChange() {
    // Handle device rotation
    setTimeout(() => {
      this.adjustMobileLayout()
      window.scrollTo(0, 0)
    }, 200)
  }

  adjustMobileLayout() {
    // Adjust layout based on screen size and orientation
    const isLandscape = window.innerWidth > window.innerHeight
    const isSmallScreen = window.innerWidth < 375

    if (isSmallScreen) {
      document.body.classList.add("small-screen")
    } else {
      document.body.classList.remove("small-screen")
    }

    if (isLandscape && window.innerWidth < 768) {
      document.body.classList.add("landscape-mobile")
    } else {
      document.body.classList.remove("landscape-mobile")
    }
  }

  async loadInitialWeather() {
    if (navigator.geolocation) {
      try {
        const position = await this.getCurrentPosition()
        await this.getWeatherByCoords(position.coords.latitude, position.coords.longitude)
      } catch (error) {
        console.log("Geolocation failed, loading default city")
        await this.getWeatherByCity("New York")
      }
    } else {
      await this.getWeatherByCity("New York")
    }
  }

  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      })
    })
  }

  async getCurrentLocation() {
    if (!navigator.geolocation) {
      this.showError("Location not supported")
      return
    }

    this.showLoading()

    try {
      const position = await this.getCurrentPosition()
      await this.getWeatherByCoords(position.coords.latitude, position.coords.longitude)
    } catch (error) {
      this.showError("Can't get your location")
    }
  }

  async handleSearchInput(e) {
    const query = e.target.value.trim()

    if (query.length > 0) {
      this.clearSearch?.classList.remove("hidden")
    } else {
      this.clearSearch?.classList.add("hidden")
      this.hideSuggestions()
      return
    }

    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout)
    }

    this.searchTimeout = setTimeout(async () => {
      if (query.length >= 2) {
        await this.showSearchSuggestions(query)
      } else {
        this.hideSuggestions()
      }
    }, 300)
  }

  handleSearchKeydown(e) {
    if (e.key === "Enter") {
      e.preventDefault()
      this.handleSearch()
    } else if (e.key === "Escape") {
      this.hideSuggestions()
      this.cityInput?.blur()
    }
  }

  handleSearchFocus() {
    const query = this.cityInput?.value.trim()
    if (query && query.length >= 2) {
      this.showSearchSuggestions(query)
    }
  }

  handleSearchBlur() {
    setTimeout(() => {
      this.hideSuggestions()
    }, 200)
  }

  clearSearchInput() {
    if (this.cityInput) {
      this.cityInput.value = ""
      this.clearSearch?.classList.add("hidden")
      this.hideSuggestions()
      this.cityInput.focus()
    }
  }

  async handleSearch() {
    const query = this.cityInput?.value.trim()
    if (!query) return

    this.hideSuggestions()
    await this.getWeatherByCity(query)
  }

  async showSearchSuggestions(query) {
    try {
      const suggestions = await this.getLocationSuggestions(query)
      if (suggestions.length > 0) {
        this.renderSuggestions(suggestions)
        this.searchSuggestions?.classList.remove("hidden")
      } else {
        this.hideSuggestions()
      }
    } catch (error) {
      this.hideSuggestions()
    }
  }

  async getLocationSuggestions(query) {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${this.weatherApiKey}`,
      )
      const data = await response.json()
      return data.map((item) => ({
        name: item.name,
        country: item.country,
        state: item.state || "",
        lat: item.lat,
        lon: item.lon,
      }))
    } catch (error) {
      return []
    }
  }

  renderSuggestions(suggestions) {
    if (!this.suggestionsList) return

    this.suggestionsList.innerHTML = suggestions
      .map(
        (suggestion) => `
      <div class="suggestion-item" data-lat="${suggestion.lat}" data-lon="${suggestion.lon}" data-name="${suggestion.name}">
        <div class="suggestion-icon">
          <i class="fas fa-map-marker-alt"></i>
        </div>
        <div class="suggestion-content">
          <div class="suggestion-name">${suggestion.name}</div>
          <div class="suggestion-details">
            ${suggestion.state ? `${suggestion.state}, ` : ""}${suggestion.country}
          </div>
        </div>
      </div>
    `,
      )
      .join("")

    this.suggestionsList.querySelectorAll(".suggestion-item").forEach((item) => {
      item.addEventListener("click", () => {
        const lat = Number.parseFloat(item.dataset.lat)
        const lon = Number.parseFloat(item.dataset.lon)
        const name = item.dataset.name

        if (this.cityInput) {
          this.cityInput.value = name
        }
        this.hideSuggestions()
        this.getWeatherByCoords(lat, lon)
      })
    })
  }

  hideSuggestions() {
    this.searchSuggestions?.classList.add("hidden")
  }

  handleGlobalClick(e) {
    if (!this.cityInput?.contains(e.target) && !this.searchSuggestions?.contains(e.target)) {
      this.hideSuggestions()
    }
  }

  showLoading() {
    this.loadingState?.classList.remove("hidden")
    this.errorState?.classList.add("hidden")
    this.weatherContent?.classList.add("hidden")
  }

  showError(message) {
    this.loadingState?.classList.add("hidden")
    this.errorState?.classList.remove("hidden")
    this.weatherContent?.classList.add("hidden")

    if (this.errorMessage) {
      this.errorMessage.textContent = message
    }
  }

  showWeather() {
    this.loadingState?.classList.add("hidden")
    this.errorState?.classList.add("hidden")
    this.weatherContent?.classList.remove("hidden")
  }

  async retryWeatherLoad() {
    if (this.currentLocation) {
      await this.getWeatherByCoords(this.currentLocation.lat, this.currentLocation.lon)
    } else {
      await this.loadInitialWeather()
    }
  }

  async getWeatherByCity(cityName) {
    this.showLoading()

    try {
      const weatherResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&appid=${this.weatherApiKey}&units=${this.currentUnit}`,
      )

      if (!weatherResponse.ok) {
        throw new Error(`Weather API error: ${weatherResponse.status}`)
      }

      const weatherData = await weatherResponse.json()

      const forecastResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(cityName)}&appid=${this.weatherApiKey}&units=${this.currentUnit}`,
      )

      if (!forecastResponse.ok) {
        throw new Error(`Forecast API error: ${forecastResponse.status}`)
      }

      const forecastData = await forecastResponse.json()

      this.currentWeatherData = weatherData
      this.forecastData = forecastData
      this.currentLocation = {
        lat: weatherData.coord.lat,
        lon: weatherData.coord.lon,
        name: weatherData.name,
      }

      this.updateWeatherDisplay()
      this.showWeather()
    } catch (error) {
      console.error("Weather API error:", error)
      this.showError("Can't load weather data")
    }
  }

  async getWeatherByCoords(lat, lon) {
    this.showLoading()

    try {
      const weatherResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${this.weatherApiKey}&units=${this.currentUnit}`,
      )

      if (!weatherResponse.ok) {
        throw new Error(`Weather API error: ${weatherResponse.status}`)
      }

      const weatherData = await weatherResponse.json()

      const forecastResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${this.weatherApiKey}&units=${this.currentUnit}`,
      )

      if (!forecastResponse.ok) {
        throw new Error(`Forecast API error: ${forecastResponse.status}`)
      }

      const forecastData = await forecastResponse.json()

      this.currentWeatherData = weatherData
      this.forecastData = forecastData
      this.currentLocation = { lat, lon, name: weatherData.name }

      this.updateWeatherDisplay()
      this.showWeather()
    } catch (error) {
      console.error("Weather API error:", error)
      this.showError("Can't load weather for location")
    }
  }

  updateWeatherDisplay() {
    if (!this.currentWeatherData || !this.forecastData) return

    this.updateCurrentWeather()
    this.updateWeatherDetails()
    this.updateHourlyForecast()
    this.updateWeeklyForecast()
  }

  updateCurrentWeather() {
    const data = this.currentWeatherData
    const weather = data.weather[0]

    // Location
    if (this.currentCity) this.currentCity.textContent = data.name
    if (this.currentCountry) this.currentCountry.textContent = data.sys?.country || ""
    if (this.currentDate) this.currentDate.textContent = this.formatDate(new Date())

    // Temperature
    if (this.currentTemp) {
      this.currentTemp.textContent = `${Math.round(data.main.temp)}°`
    }
    if (this.feelsLike) {
      this.feelsLike.textContent = `${Math.round(data.main.feels_like)}°`
    }
    if (this.tempHigh) {
      this.tempHigh.textContent = `${Math.round(data.main.temp_max)}°`
    }
    if (this.tempLow) {
      this.tempLow.textContent = `${Math.round(data.main.temp_min)}°`
    }

    // Weather condition
    if (this.currentWeatherIcon) {
      this.currentWeatherIcon.className = `fas ${this.getWeatherIconClass(weather.main)}`
    }
    if (this.currentCondition) {
      this.currentCondition.textContent = weather.main
    }
    if (this.conditionDescription) {
      this.conditionDescription.textContent = this.getWeatherDescription(weather.main)
    }
  }

  updateWeatherDetails() {
    const data = this.currentWeatherData

    // Visibility
    if (this.visibility) {
      const visibilityKm = (data.visibility / 1000).toFixed(1)
      this.visibility.textContent = `${visibilityKm} km`
    }

    // Humidity
    if (this.humidity) {
      this.humidity.textContent = `${data.main.humidity}%`
    }

    // Wind
    if (this.windSpeed) {
      const windKmh = Math.round(data.wind.speed * 3.6)
      this.windSpeed.textContent = `${windKmh} km/h`
    }

    // Pressure
    if (this.pressure) {
      this.pressure.textContent = `${Math.round(data.main.pressure)} hPa`
    }

    // UV Index (mock)
    const uvIndex = Math.floor(Math.random() * 11)
    if (this.uvIndex) {
      this.uvIndex.textContent = uvIndex.toString()
    }

    // Precipitation (mock)
    const precipitationChance = Math.floor(Math.random() * 100)
    if (this.precipitation) {
      this.precipitation.textContent = `${precipitationChance}%`
    }
  }

  updateHourlyForecast() {
    if (!this.hourlyForecast || !this.forecastData) return

    const hourlyData = this.forecastData.list.slice(0, 24)

    this.hourlyForecast.innerHTML = hourlyData
      .map((item, index) => {
        const date = new Date(item.dt * 1000)
        const temp = Math.round(item.main.temp)
        const precipitation = Math.round(item.pop * 100)

        return `
        <div class="hourly-item">
          <div class="hourly-time">${index === 0 ? "Now" : this.formatTime(date)}</div>
          <div class="hourly-icon">
            <i class="${this.getWeatherIconClass(item.weather[0].main)}"></i>
          </div>
          <div class="hourly-temp">${temp}°</div>
          <div class="hourly-desc">${item.weather[0].description}</div>
          ${precipitation > 10 ? `<div class="hourly-precipitation">${precipitation}%</div>` : ""}
        </div>
      `
      })
      .join("")
  }

  updateWeeklyForecast() {
    if (!this.weeklyForecast || !this.forecastData) return

    const dailyData = this.groupForecastByDay(this.forecastData.list)

    this.weeklyForecast.innerHTML = dailyData
      .map((day, index) => {
        const date = new Date(day.dt * 1000)
        const dayName = index === 0 ? "Today" : index === 1 ? "Tomorrow" : this.formatDayName(date)
        const dateStr = this.formatShortDate(date)
        const high = Math.round(day.temp_max)
        const low = Math.round(day.temp_min)

        return `
        <div class="weekly-item">
          <div class="weekly-day-info">
            <div class="weekly-day">${dayName}</div>
            <div class="weekly-date">${dateStr}</div>
          </div>
          <div class="weekly-icon">
            <i class="${this.getWeatherIconClass(day.weather)}"></i>
          </div>
          <div class="weekly-temps">
            <span class="weekly-high">${high}°</span>
            <span class="weekly-low">${low}°</span>
          </div>
        </div>
      `
      })
      .join("")
  }

  groupForecastByDay(forecastList) {
    const dailyData = {}

    forecastList.forEach((item) => {
      const date = new Date(item.dt * 1000)
      const dayKey = date.toDateString()

      if (!dailyData[dayKey]) {
        dailyData[dayKey] = {
          dt: item.dt,
          temp_max: item.main.temp_max,
          temp_min: item.main.temp_min,
          weather: item.weather[0].main,
          description: item.weather[0].description,
          pop: item.pop,
        }
      } else {
        dailyData[dayKey].temp_max = Math.max(dailyData[dayKey].temp_max, item.main.temp_max)
        dailyData[dayKey].temp_min = Math.min(dailyData[dayKey].temp_min, item.main.temp_min)
        dailyData[dayKey].pop = Math.max(dailyData[dayKey].pop, item.pop)
      }
    })

    return Object.values(dailyData).slice(0, 7)
  }

  changeUnit(unit) {
    if (this.currentUnit === unit) return

    this.currentUnit = unit

    if (unit === "metric") {
      this.celsiusBtn?.classList.add("active")
      this.fahrenheitBtn?.classList.remove("active")
    } else {
      this.fahrenheitBtn?.classList.add("active")
      this.celsiusBtn?.classList.remove("active")
    }

    if (this.currentLocation) {
      this.getWeatherByCoords(this.currentLocation.lat, this.currentLocation.lon)
    }
  }

  scrollHourlyForecast(direction) {
    if (!this.hourlyForecast) return

    const scrollAmount = 150
    const currentScroll = this.hourlyForecast.scrollLeft

    if (direction === "prev") {
      this.hourlyForecast.scrollTo({
        left: currentScroll - scrollAmount,
        behavior: "smooth",
      })
    } else {
      this.hourlyForecast.scrollTo({
        left: currentScroll + scrollAmount,
        behavior: "smooth",
      })
    }
  }

  toggleTheme() {
    this.theme = this.theme === "light" ? "dark" : "light"
    this.applyTheme()
    localStorage.setItem("weather-theme", this.theme)
  }

  applyTheme() {
    document.documentElement.setAttribute("data-theme", this.theme)

    if (this.themeToggle) {
      const icon = this.themeToggle.querySelector("i")
      if (icon) {
        icon.className = this.theme === "light" ? "fas fa-moon" : "fas fa-sun"
      }
    }
  }

  // Utility methods
  getWeatherIconClass(weatherType) {
    const iconMap = {
      Clear: "fa-sun",
      Clouds: "fa-cloud",
      Rain: "fa-cloud-rain",
      Drizzle: "fa-cloud-drizzle",
      Thunderstorm: "fa-bolt",
      Snow: "fa-snowflake",
      Mist: "fa-smog",
      Fog: "fa-smog",
      Haze: "fa-smog",
    }
    return iconMap[weatherType] || "fa-sun"
  }

  getWeatherDescription(weatherType) {
    const descriptions = {
      Clear: "Perfect day",
      Clouds: "Partly cloudy",
      Rain: "Rainy weather",
      Snow: "Snowy conditions",
      Thunderstorm: "Stormy weather",
    }
    return descriptions[weatherType] || "Current weather"
  }

  formatDate(date) {
    const today = new Date()
    if (date.toDateString() === today.toDateString()) {
      return "Today"
    }
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    })
  }

  formatShortDate(date) {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  formatTime(date) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      hour12: true,
    })
  }

  formatDayName(date) {
    return date.toLocaleDateString("en-US", { weekday: "long" })
  }
}

// Initialize the mobile weather app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.mobileWeatherApp = new MobileWeatherApp()
})
