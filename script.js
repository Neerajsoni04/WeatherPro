class ProfessionalWeatherApp {
  constructor() {
    // API Configuration
    this.weatherApiKey = "3cee5ebd1e389e41f87cd6a4019c98d1" // Replace with your OpenWeatherMap API key
    this.geocodingApiKey = "3cee5ebd1e389e41f87cd6a4019c98d1" // Same key works for geocoding

    // App State
    this.currentUnit = "metric" // 'metric' for Celsius, 'imperial' for Fahrenheit
    this.currentWeatherData = null
    this.forecastData = null
    this.currentLocation = null
    this.searchTimeout = null
    this.theme = localStorage.getItem("weather-theme") || "light"

    // Initialize the application
    this.initializeApp()
  }

  async initializeApp() {
    try {
      this.initializeElements()
      this.bindEvents()
      this.applyTheme()
      await this.loadInitialWeather()
    } catch (error) {
      console.error("Failed to initialize app:", error)
      this.showError("Failed to initialize the application. Please refresh the page.")
    }
  }

  initializeElements() {
    // Navigation elements
    this.locationBtn = document.getElementById("locationBtn")
    this.themeToggle = document.getElementById("themeToggle")
    this.settingsBtn = document.getElementById("settingsBtn")

    // Search elements
    this.cityInput = document.getElementById("cityInput")
    this.clearSearch = document.getElementById("clearSearch")
    this.searchBtn = document.getElementById("searchBtn")
    this.searchSuggestions = document.getElementById("searchSuggestions")
    this.suggestionsList = document.getElementById("suggestionsList")

    // State elements
    this.loadingState = document.getElementById("loadingState")
    this.errorState = document.getElementById("errorState")
    this.errorMessage = document.getElementById("errorMessage")
    this.retryBtn = document.getElementById("retryBtn")
    this.weatherContent = document.getElementById("weatherContent")

    // Weather display elements
    this.currentCity = document.getElementById("currentCity")
    this.currentCountry = document.getElementById("currentCountry")
    this.currentDate = document.getElementById("currentDate")
    this.lastUpdated = document.getElementById("lastUpdated")
    this.currentTemp = document.getElementById("currentTemp")
    this.currentWeatherIcon = document.getElementById("currentWeatherIcon")
    this.currentCondition = document.getElementById("currentCondition")
    this.conditionDescription = document.getElementById("conditionDescription")
    this.feelsLike = document.getElementById("feelsLike")
    this.tempHigh = document.getElementById("tempHigh")
    this.tempLow = document.getElementById("tempLow")

    // Unit controls
    this.celsiusBtn = document.getElementById("celsiusBtn")
    this.fahrenheitBtn = document.getElementById("fahrenheitBtn")

    // Weather metrics
    this.visibility = document.getElementById("visibility")
    this.humidity = document.getElementById("humidity")
    this.humidityProgress = document.getElementById("humidityProgress")
    this.windSpeed = document.getElementById("windSpeed")
    this.windDirection = document.getElementById("windDirection")
    this.windArrow = document.getElementById("windArrow")
    this.pressure = document.getElementById("pressure")
    this.uvIndex = document.getElementById("uvIndex")
    this.uvIndicator = document.getElementById("uvIndicator")
    this.precipitation = document.getElementById("precipitation")
    this.precipitationChance = document.getElementById("precipitationChance")

    // Forecast elements
    this.hourlyPrev = document.getElementById("hourlyPrev")
    this.hourlyNext = document.getElementById("hourlyNext")
    this.hourlyForecast = document.getElementById("hourlyForecast")
    this.detailedToggle = document.getElementById("detailedToggle")
    this.weeklyForecast = document.getElementById("weeklyForecast")

    // Insights
    this.rainInsight = document.getElementById("rainInsight")
    this.tempInsight = document.getElementById("tempInsight")
    this.activityInsight = document.getElementById("activityInsight")

    // Footer
    this.footerLastUpdated = document.getElementById("footerLastUpdated")
  }

  bindEvents() {
    // Navigation events
    this.locationBtn?.addEventListener("click", () => this.getCurrentLocation())
    this.themeToggle?.addEventListener("click", () => this.toggleTheme())
    this.settingsBtn?.addEventListener("click", () => this.showSettings())

    // Search events
    this.cityInput?.addEventListener("input", (e) => this.handleSearchInput(e))
    this.cityInput?.addEventListener("keydown", (e) => this.handleSearchKeydown(e))
    this.cityInput?.addEventListener("focus", () => this.handleSearchFocus())
    this.cityInput?.addEventListener("blur", () => this.handleSearchBlur())
    this.clearSearch?.addEventListener("click", () => this.clearSearchInput())
    this.searchBtn?.addEventListener("click", () => this.handleSearch())

    // Error retry
    this.retryBtn?.addEventListener("click", () => this.retryWeatherLoad())

    // Unit conversion
    this.celsiusBtn?.addEventListener("click", () => this.changeUnit("metric"))
    this.fahrenheitBtn?.addEventListener("click", () => this.changeUnit("imperial"))

    // Forecast navigation
    this.hourlyPrev?.addEventListener("click", () => this.scrollHourlyForecast("prev"))
    this.hourlyNext?.addEventListener("click", () => this.scrollHourlyForecast("next"))
    this.detailedToggle?.addEventListener("click", () => this.toggleDetailedForecast())

    // Global events
    document.addEventListener("click", (e) => this.handleGlobalClick(e))
    window.addEventListener("resize", () => this.handleResize())
    window.addEventListener("online", () => this.handleOnline())
    window.addEventListener("offline", () => this.handleOffline())
  }

  async loadInitialWeather() {
    // Try to get user's location first
    if (navigator.geolocation) {
      try {
        const position = await this.getCurrentPosition()
        await this.getWeatherByCoords(position.coords.latitude, position.coords.longitude)
      } catch (error) {
        console.log("Geolocation failed, loading default city:", error)
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
        maximumAge: 300000, // 5 minutes
      })
    })
  }

  async getCurrentLocation() {
    if (!navigator.geolocation) {
      this.showError("Geolocation is not supported by this browser.")
      return
    }

    this.showLoading()

    try {
      const position = await this.getCurrentPosition()
      await this.getWeatherByCoords(position.coords.latitude, position.coords.longitude)
    } catch (error) {
      console.error("Geolocation error:", error)
      this.showError("Unable to get your location. Please search for a city manually.")
    }
  }

  async handleSearchInput(e) {
    const query = e.target.value.trim()

    // Show/hide clear button
    if (query.length > 0) {
      this.clearSearch?.classList.remove("hidden")
    } else {
      this.clearSearch?.classList.add("hidden")
      this.hideSuggestions()
      return
    }

    // Clear previous timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout)
    }

    // Debounce search suggestions
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
    // Delay hiding suggestions to allow for clicks
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
      // For demo purposes, using mock suggestions
      // In production, replace with real geocoding API call
      const suggestions = await this.getLocationSuggestions(query)

      if (suggestions.length > 0) {
        this.renderSuggestions(suggestions)
        this.searchSuggestions?.classList.remove("hidden")
      } else {
        this.hideSuggestions()
      }
    } catch (error) {
      console.error("Failed to get suggestions:", error)
      this.hideSuggestions()
    }
  }

  async getLocationSuggestions(query) {
    // Mock suggestions for demo - replace with real API call
    // const mockSuggestions = [
    //   { name: "New York", country: "United States", state: "NY", lat: 40.7128, lon: -74.006 },
    //   { name: "London", country: "United Kingdom", state: "", lat: 51.5074, lon: -0.1278 },
    //   { name: "Tokyo", country: "Japan", state: "", lat: 35.6762, lon: 139.6503 },
    //   { name: "Paris", country: "France", state: "", lat: 48.8566, lon: 2.3522 },
    //   { name: "Sydney", country: "Australia", state: "NSW", lat: -33.8688, lon: 151.2093 },
    //   { name: "Berlin", country: "Germany", state: "", lat: 52.52, lon: 13.405 },
    //   { name: "Toronto", country: "Canada", state: "ON", lat: 43.6532, lon: -79.3832 },
    //   { name: "Mumbai", country: "India", state: "MH", lat: 19.076, lon: 72.8777 },
    // ]

    // return mockSuggestions
    //   .filter(
    //     (city) =>
    //       city.name.toLowerCase().includes(query.toLowerCase()) ||
    //       city.country.toLowerCase().includes(query.toLowerCase()),
    //   )
    //   .slice(0, 5)

    // /* Real API implementation:
    try {
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${this.geocodingApiKey}`
      )
      const data = await response.json()
      return data.map(item => ({
        name: item.name,
        country: item.country,
        state: item.state || '',
        lat: item.lat,
        lon: item.lon
      }))
    } catch (error) {
      console.error('Geocoding API error:', error)
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

    // Add click events to suggestions
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
    // Hide suggestions when clicking outside search area
    if (!this.cityInput?.contains(e.target) && !this.searchSuggestions?.contains(e.target)) {
      this.hideSuggestions()
    }
  }

  handleResize() {
    // Handle responsive adjustments if needed
    this.updateHourlyScroll()
  }

  handleOnline() {
    console.log("Connection restored")
    // Optionally refresh weather data
  }

  handleOffline() {
    console.log("Connection lost")
    this.showError("No internet connection. Please check your network and try again.")
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

    // try {
    //   // For demo purposes, using mock data
    //   // Replace with real API calls in production
    //   await this.simulateApiDelay()

    //   const mockWeatherData = this.generateMockWeatherData(cityName)
    //   const mockForecastData = this.generateMockForecastData()

    //   this.currentWeatherData = mockWeatherData
    //   this.forecastData = mockForecastData
    //   this.currentLocation = { lat: 40.7128, lon: -74.006, name: cityName }

    //   this.updateWeatherDisplay()
    //   this.showWeather()
    // } catch (error) {
    //   console.error("Weather API error:", error)
    //   this.showError("Failed to fetch weather data. Please check the city name and try again.")
    // }

    // Real API implementation:
    try {
      const weatherResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&appid=${this.weatherApiKey}&units=${this.currentUnit}`
      )
      
      if (!weatherResponse.ok) {
        throw new Error(`Weather API error: ${weatherResponse.status}`)
      }
      
      const weatherData = await weatherResponse.json()
      
      const forecastResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(cityName)}&appid=${this.weatherApiKey}&units=${this.currentUnit}`
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
        name: weatherData.name 
      }
      
      this.updateWeatherDisplay()
      this.showWeather()
      
    } catch (error) {
      console.error('Weather API error:', error)
      this.showError('Failed to fetch weather data. Please check the city name and try again.')
    }
  }

  async getWeatherByCoords(lat, lon) {
    this.showLoading()

    // try {
      // For demo purposes, using mock data
    //   await this.simulateApiDelay()

    //   const mockWeatherData = this.generateMockWeatherData("Your Location")
    //   const mockForecastData = this.generateMockForecastData()

    //   this.currentWeatherData = mockWeatherData
    //   this.forecastData = mockForecastData
    //   this.currentLocation = { lat, lon, name: "Your Location" }

    //   this.updateWeatherDisplay()
    //   this.showWeather()
    // } catch (error) {
    //   console.error("Weather API error:", error)
    //   this.showError("Failed to fetch weather data for your location.")
    // }

    // Real API implementation:
    try {
      const weatherResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${this.weatherApiKey}&units=${this.currentUnit}`
      )
      
      if (!weatherResponse.ok) {
        throw new Error(`Weather API error: ${weatherResponse.status}`)
      }
      
      const weatherData = await weatherResponse.json()
      
      const forecastResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${this.weatherApiKey}&units=${this.currentUnit}`
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
      console.error('Weather API error:', error)
      this.showError('Failed to fetch weather data for your location.')
    }
    
  }

  simulateApiDelay() {
    return new Promise((resolve) => setTimeout(resolve, 1500))
  }

  generateMockWeatherData(cityName) {
    const weatherConditions = [
      { main: "Clear", description: "clear sky", icon: "fa-sun" },
      { main: "Clouds", description: "few clouds", icon: "fa-cloud-sun" },
      { main: "Clouds", description: "scattered clouds", icon: "fa-cloud" },
      { main: "Rain", description: "light rain", icon: "fa-cloud-rain" },
      { main: "Snow", description: "light snow", icon: "fa-snowflake" },
    ]

    const randomWeather = weatherConditions[Math.floor(Math.random() * weatherConditions.length)]
    const baseTemp = 15 + Math.random() * 20 // 15-35°C

    return {
      name: cityName,
      sys: { country: "US" },
      main: {
        temp: baseTemp,
        feels_like: baseTemp + (Math.random() * 6 - 3),
        temp_min: baseTemp - Math.random() * 5,
        temp_max: baseTemp + Math.random() * 8,
        humidity: 40 + Math.random() * 40,
        pressure: 1000 + Math.random() * 50,
      },
      weather: [randomWeather],
      wind: {
        speed: Math.random() * 15,
        deg: Math.random() * 360,
      },
      visibility: 8000 + Math.random() * 7000,
      dt: Date.now() / 1000,
    }
  }

  generateMockForecastData() {
    const forecast = []
    const weatherTypes = ["Clear", "Clouds", "Rain", "Snow"]

    for (let i = 0; i < 40; i++) {
      // 5 days * 8 (3-hour intervals)
      const randomWeather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)]
      const baseTemp = 10 + Math.random() * 25

      forecast.push({
        dt: Date.now() / 1000 + i * 3 * 60 * 60, // 3-hour intervals
        main: {
          temp: baseTemp,
          temp_max: baseTemp + Math.random() * 5,
          temp_min: baseTemp - Math.random() * 3,
          humidity: 30 + Math.random() * 50,
        },
        weather: [
          {
            main: randomWeather,
            description: randomWeather.toLowerCase(),
            icon: this.getWeatherIcon(randomWeather),
          },
        ],
        wind: {
          speed: Math.random() * 10,
          deg: Math.random() * 360,
        },
        pop: Math.random() * 0.8, // Probability of precipitation
      })
    }

    return { list: forecast }
  }

  updateWeatherDisplay() {
    if (!this.currentWeatherData || !this.forecastData) return

    this.updateCurrentWeather()
    this.updateWeatherMetrics()
    this.updateHourlyForecast()
    this.updateWeeklyForecast()
    this.updateWeatherInsights()
    this.updateLastUpdated()
  }

  updateCurrentWeather() {
    const data = this.currentWeatherData
    const weather = data.weather[0]

    // Location info
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

  updateWeatherMetrics() {
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
    if (this.humidityProgress) {
      this.humidityProgress.style.width = `${data.main.humidity}%`
    }

    // Wind
    if (this.windSpeed) {
      const windKmh = Math.round(data.wind.speed * 3.6)
      this.windSpeed.textContent = `${windKmh} km/h`
    }
    if (this.windDirection) {
      this.windDirection.textContent = this.getWindDirection(data.wind.deg)
    }
    if (this.windArrow) {
      this.windArrow.style.transform = `rotate(${data.wind.deg}deg)`
    }

    // Pressure
    if (this.pressure) {
      this.pressure.textContent = `${Math.round(data.main.pressure)} hPa`
    }

    // UV Index (mock data)
    const uvIndex = Math.floor(Math.random() * 11)
    if (this.uvIndex) {
      this.uvIndex.textContent = uvIndex.toString()
    }
    if (this.uvIndicator) {
      const uvLevel = this.getUVLevel(uvIndex)
      this.uvIndicator.textContent = uvLevel.text
      this.uvIndicator.className = `uv-indicator ${uvLevel.class}`
    }

    // Precipitation (mock data)
    const precipitationMm = Math.random() * 5
    const precipitationChance = Math.floor(Math.random() * 100)
    if (this.precipitation) {
      this.precipitation.textContent = `${precipitationMm.toFixed(1)} mm`
    }
    if (this.precipitationChance) {
      this.precipitationChance.textContent = `${precipitationChance}% chance`
    }
  }

  updateHourlyForecast() {
    if (!this.hourlyForecast || !this.forecastData) return

    const hourlyData = this.forecastData.list.slice(0, 24) // Next 24 hours (8 * 3-hour intervals)

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
        const precipitation = Math.round(day.pop * 100)

        return `
        <div class="weekly-item">
          <div class="weekly-day-info">
            <div class="weekly-day">${dayName}</div>
            <div class="weekly-date">${dateStr}</div>
          </div>
          <div class="weekly-icon">
            <i class="${this.getWeatherIconClass(day.weather)}"></i>
          </div>
          <div class="weekly-desc">${day.description}</div>
          <div class="weekly-precipitation">
            <i class="fas fa-tint"></i>
            <span>${precipitation}%</span>
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

  updateWeatherInsights() {
    const data = this.currentWeatherData
    const weather = data.weather[0]

    // Rain insight
    if (this.rainInsight) {
      if (weather.main === "Rain") {
        this.rainInsight.textContent = "Rain is expected. Consider bringing an umbrella when going out."
      } else {
        this.rainInsight.textContent = "No rain expected in the next 24 hours. Perfect for outdoor activities!"
      }
    }

    // Temperature insight
    if (this.tempInsight) {
      const temp = data.main.temp
      if (temp > 25) {
        this.tempInsight.textContent = "Warm weather ahead. Stay hydrated and wear light clothing."
      } else if (temp < 10) {
        this.tempInsight.textContent = "Cool temperatures expected. Dress warmly and layer up."
      } else {
        this.tempInsight.textContent = "Comfortable temperatures throughout the day. Perfect weather conditions."
      }
    }

    // Activity insight
    if (this.activityInsight) {
      const windSpeed = data.wind.speed * 3.6 // Convert to km/h
      const humidity = data.main.humidity

      if (weather.main === "Clear" && windSpeed < 15 && humidity < 70) {
        this.activityInsight.textContent = "Excellent conditions for outdoor sports, jogging, and cycling."
      } else if (weather.main === "Rain") {
        this.activityInsight.textContent = "Great day for indoor activities like museums, shopping, or reading."
      } else {
        this.activityInsight.textContent = "Good conditions for most outdoor activities with proper preparation."
      }
    }
  }

  updateLastUpdated() {
    const now = new Date()
    const timeStr = this.formatTime(now)

    if (this.lastUpdated) {
      this.lastUpdated.textContent = `Updated ${timeStr}`
    }
    if (this.footerLastUpdated) {
      this.footerLastUpdated.textContent = timeStr
    }
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

    return Object.values(dailyData).slice(0, 7) // 7 days
  }

  changeUnit(unit) {
    if (this.currentUnit === unit) return

    this.currentUnit = unit

    // Update active button
    if (unit === "metric") {
      this.celsiusBtn?.classList.add("active")
      this.fahrenheitBtn?.classList.remove("active")
    } else {
      this.fahrenheitBtn?.classList.add("active")
      this.celsiusBtn?.classList.remove("active")
    }

    // Reload weather data with new units
    if (this.currentLocation) {
      this.getWeatherByCoords(this.currentLocation.lat, this.currentLocation.lon)
    }
  }

  scrollHourlyForecast(direction) {
    if (!this.hourlyForecast) return

    const scrollAmount = 200
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

  updateHourlyScroll() {
    // Update scroll button states based on scroll position
    if (!this.hourlyForecast) return

    const { scrollLeft, scrollWidth, clientWidth } = this.hourlyForecast

    if (this.hourlyPrev) {
      this.hourlyPrev.disabled = scrollLeft <= 0
    }
    if (this.hourlyNext) {
      this.hourlyNext.disabled = scrollLeft >= scrollWidth - clientWidth
    }
  }

  toggleDetailedForecast() {
    // Toggle between simple and detailed forecast view
    const isDetailed = this.weeklyForecast?.classList.contains("detailed")

    if (isDetailed) {
      this.weeklyForecast?.classList.remove("detailed")
      if (this.detailedToggle) {
        this.detailedToggle.innerHTML = '<span>Detailed View</span><i class="fas fa-chevron-down"></i>'
      }
    } else {
      this.weeklyForecast?.classList.add("detailed")
      if (this.detailedToggle) {
        this.detailedToggle.innerHTML = '<span>Simple View</span><i class="fas fa-chevron-up"></i>'
      }
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

  showSettings() {
    // Placeholder for settings modal
    alert("Settings panel coming soon!")
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

  getWeatherIcon(weatherType) {
    const iconMap = {
      Clear: "01d",
      Clouds: "02d",
      Rain: "10d",
      Snow: "13d",
    }
    return iconMap[weatherType] || "01d"
  }

  getWeatherDescription(weatherType) {
    const descriptions = {
      Clear: "Perfect weather for outdoor activities",
      Clouds: "Partly cloudy with comfortable conditions",
      Rain: "Rainy weather, consider indoor activities",
      Snow: "Snowy conditions, dress warmly",
      Thunderstorm: "Stormy weather, stay indoors if possible",
    }
    return descriptions[weatherType] || "Current weather conditions"
  }

  getWindDirection(degrees) {
    const directions = [
      "N",
      "NNE",
      "NE",
      "ENE",
      "E",
      "ESE",
      "SE",
      "SSE",
      "S",
      "SSW",
      "SW",
      "WSW",
      "W",
      "WNW",
      "NW",
      "NNW",
    ]
    const index = Math.round(degrees / 22.5) % 16
    return directions[index]
  }

  getUVLevel(uvIndex) {
    if (uvIndex <= 2) return { text: "Low", class: "uv-low" }
    if (uvIndex <= 5) return { text: "Moderate", class: "uv-moderate" }
    if (uvIndex <= 7) return { text: "High", class: "uv-high" }
    if (uvIndex <= 10) return { text: "Very High", class: "uv-very-high" }
    return { text: "Extreme", class: "uv-extreme" }
  }

  formatDate(date) {
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }
    return date.toLocaleDateString("en-US", options)
  }

  formatShortDate(date) {
    const options = {
      month: "short",
      day: "numeric",
    }
    return date.toLocaleDateString("en-US", options)
  }

  formatTime(date) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  formatDayName(date) {
    return date.toLocaleDateString("en-US", { weekday: "long" })
  }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.weatherApp = new ProfessionalWeatherApp()
})

// API Integration Instructions:
/*
To integrate with real weather APIs:

1. Get your free API key from OpenWeatherMap:
   - Visit: https://openweathermap.org/api
   - Sign up for a free account
   - Generate an API key
   - Replace 'YOUR_OPENWEATHER_API_KEY' with your actual key

2. Uncomment the real API implementation sections in:
   - getWeatherByCity()
   - getWeatherByCoords()
   - getLocationSuggestions()

3. Comment out or remove the mock data generation methods:
   - generateMockWeatherData()
   - generateMockForecastData()
   - simulateApiDelay()

4. The app will then use real weather data from OpenWeatherMap

API Endpoints used:
- Current Weather: https://api.openweathermap.org/data/2.5/weather
- 5-Day Forecast: https://api.openweathermap.org/data/2.5/forecast
- Geocoding: https://api.openweathermap.org/geo/1.0/direct

Rate Limits (Free Plan):
- 1,000 calls per day
- 60 calls per minute
*/
