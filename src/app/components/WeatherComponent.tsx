'use client'
import { WeatherData, GeoData, ForecastData, DailyForecast } from '../Interfaces/Interfaces';
import React, { useState, useEffect } from 'react';
import { getDayName, formatTime12Hour } from '../utils/Dataservices';

const WeatherComponent: React.FC = () => {


  

  const [currentCity, setCurrentCity] = useState<string>(() => '');
  const [isFahrenheit, setIsFahrenheit] = useState<boolean>(() => true);

  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [geoData, setGeoData] = useState<GeoData | null>(null);

  const [forecastData, setForecastData] = useState<DailyForecast[] | null>(null);
  const [savedCities, setSavedCities] = useState<string[]>(() => []);
  const [searchQuery, setSearchQuery] = useState('');


  const [isSidebarOpen, setIsSidebarOpen] = useState(false);


  const [isLoading, setIsLoading] = useState(true);
const [hasError, setHasError] = useState(false);



  // Function to handle city selection from sidebar
  const handleCitySelect = async (cityName: string) => {
    // Fetch weather data for selected city
    fetchGeoData(cityName);
  };

  useEffect(() => {
    // This code runs after the component mounts, ensuring access to localStorage
    const storedCity = localStorage.getItem('currentCity') || '';
    setCurrentCity(storedCity);
    
    const storedPreference = localStorage.getItem('isFahrenheit');
    setIsFahrenheit(storedPreference ? JSON.parse(storedPreference) : true);
  }, []);

  useEffect(() => {

    localStorage.setItem('savedCities', JSON.stringify(savedCities));
    console.log("this is line 48 " + localStorage.getItem('savedCities'))
  }, [savedCities]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleToggleChange = () => {
    const newIsFahrenheit = !isFahrenheit;
    setIsFahrenheit(newIsFahrenheit);
    // Save the new setting to localStorage
    localStorage.setItem('isFahrenheit', JSON.stringify(newIsFahrenheit));
  };

  useEffect(() => {
    if (currentCity) {
      fetchGeoData(currentCity);
    }
  }, [isFahrenheit, currentCity]);


  useEffect(() => {
    const fetchGeoDataForDeviceLocation = async () => {
      if (!navigator.geolocation) {
        console.error("Geolocation is not supported by this browser.");
        // Optionally, fetch for a default city if geolocation is not supported
        fetchGeoData('Stockton'); //  default city
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          await fetchGeoData('', latitude, longitude);
          console.log("Position object:", position);
          console.log("Latitude:", position.coords.latitude);
          console.log("Longitude:", position.coords.longitude);
          fetchWeatherData(position.coords.latitude, position.coords.longitude)
        },
        (error) => {
          console.error("Geolocation error:", error);
          fetchGeoData('Stockholm'); // Use a default city if geolocation fails
        }
      );
    };

    // Try to get the last city displayed from localStorage
    const savedCity = localStorage.getItem('currentCity');
    if (savedCity) {
      fetchGeoData(savedCity);

    } else {
      fetchGeoDataForDeviceLocation();
    }
  }, []); // The empty dependency array makes this useEffect run only once on component mount

  // Function to fetch weather data
  const fetchWeatherData = async (lat: number, lon: number) => {
    console.log("this is line 198 = " + lat)
    const units = isFahrenheit ? "imperial" : "metric";
    try {
      const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${process.env.NEXT_PUBLIC_API_KEY}&units=${units}`);
      if (!response.ok) {
        throw new Error('Weather data fetch failed');
      }

      const data: WeatherData = await response.json();
      setWeatherData(data);
      setCurrentCity(data.name);
      // return setCurrentCity = data.name
      console.log(data)
      console.log(data.name);
      
      localStorage.setItem('currentCity', data.name);
    } catch (error) {
      console.error(error);
    }
  };

  const getDayFromDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toISOString().split('T')[0]; // Returns date in 'YYYY-MM-DD' format
  };

  const groupForecastsByDay = (list: ForecastData['list']) => {
    const grouped = list.reduce((acc, item) => {
      const dayKey = getDayFromDate(item.dt);
      if (!acc[dayKey]) {
        acc[dayKey] = [];
      }
      acc[dayKey].push(item);
      return acc;
    }, {} as Record<string, ForecastData['list']>);

    return grouped;
  };

  const calculateDailyMaxMin = (grouped: ReturnType<typeof groupForecastsByDay>) => {
    return Object.entries(grouped).map(([day, forecasts]) => {
      const maxTemp = Math.max(...forecasts.map(f => f.main.temp_max));
      const minTemp = Math.min(...forecasts.map(f => f.main.temp_min));
      const icon = forecasts[0].weather[0].icon; // Taking the icon from the first forecast of the day
      return { day, maxTemp, minTemp, icon };
    });
  };


  // Helper function to convert a UTC timestamp to a local time string in 'YYYY-MM-DD' format
  const convertToLocalDateString = (timestamp: number, timezoneOffset: number): string => {
    const localDate = new Date(timestamp * 1000 + timezoneOffset * 1000);
    return localDate.toISOString().split('T')[0];
  };

  const fetchForecastData = async (lat: number, lon: number) => {
    const units = isFahrenheit ? "imperial" : "metric";
    try {
      const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${process.env.NEXT_PUBLIC_API_KEY}&units=${units}`);
      if (!response.ok) {
        throw new Error('Forecast data fetch failed');
      }
      const data: ForecastData = await response.json();

      // Calculate the local date string for 'tomorrow' based on the location's timezone
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize today's date to the start of the day
      const localTodayString = convertToLocalDateString(today.getTime() / 1000, data.city.timezone);

      const dailyForecasts = data.list.reduce((acc: DailyForecast[], item) => {
        const localDateString = convertToLocalDateString(item.dt, data.city.timezone);
 
        // Only include forecasts starting from 'tomorrow'
        if (localDateString >= localTodayString) {
          const existingForecast = acc.find(forecast => forecast.day === localDateString);
          if (existingForecast) {
            existingForecast.maxTemp = Math.max(existingForecast.maxTemp, item.main.temp_max);
            existingForecast.minTemp = Math.min(existingForecast.minTemp, item.main.temp_min);
          } else {
            acc.push({
              day: localDateString,
              maxTemp: item.main.temp_max,
              minTemp: item.main.temp_min,
              icon: item.weather[0].icon,
            });
          }
        }

        return acc;
      }, []);

      // Sort forecasts by date to ensure they are in the correct order
      dailyForecasts.sort((a, b) => a.day.localeCompare(b.day));

      // Attempt to ensure a consistent number of days are displayed
      const forecastLength = dailyForecasts.length;
      if (forecastLength > 5) {
        setForecastData(dailyForecasts.slice(0, 5)); // Limit to the first 5 days
      } else {
        setForecastData(dailyForecasts); // If less than 5, display all available
      }
    } catch (error) {
      console.error(error);
    }
  };


  // Function to fetch geo location data
const fetchGeoData = async (cityName?: string, lat?: number, lon?: number) => {
  setIsLoading(true); // Start loading
  setHasError(false); // Reset error state
  try {
    let url = `http://api.openweathermap.org/geo/1.0/direct?q=${cityName}&limit=1&appid=${process.env.NEXT_PUBLIC_API_KEY}`;
    if (!cityName) { // If cityName is not provided, use latitude and longitude
      url = `http://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${process.env.NEXT_PUBLIC_API_KEY}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Geo data fetch failed');
    }
    const data = await response.json();
    if (data.length === 0) { // Check if the response is empty
      throw new Error('No data returned for the given location');
    }
    setGeoData(data[0]);
    fetchWeatherData(data[0].lat, data[0].lon);
    fetchForecastData(data[0].lat, data[0].lon);
  } catch (error) {
    console.error(error);
    setHasError(true); // Set error state
  } finally {
    setIsLoading(false); // End loading regardless of outcome
  }
};


  

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Prevent default form submission behavior
    fetchGeoData(searchQuery);
    setSearchQuery('');
  };

  // Render weather data or a loading state
  useEffect(() => {
    if (isLoading) {
      const timeoutId = setTimeout(() => {
        if (isLoading) { // If still loading after 5 seconds
          console.error("Loading timeout reached. Clearing city and reloading.");
          localStorage.removeItem('currentCity');
          window.location.reload();
        }
      }, 5000); // 5 seconds timeout
  
      return () => clearTimeout(timeoutId);
    }
  }, [isLoading]); // Depend on isLoading
  



  //  the save button functionality
  const handleToggleCitySave = (city: string) => {
    const isCitySaved = savedCities.includes(city);
    localStorage.setItem('savedCities', city)
    if (isCitySaved) {
      setSavedCities(savedCities.filter((savedCity) => savedCity !== city));
    } else {
      setSavedCities([...savedCities, city]);
    }
  };

  return (

    <div className='min-h-screen bg-gradient-to-b from-blue-800 to-blue-400 text-white flex justify-center' >
      <div className='max-w-90p'>
        <div className='pt-14 pb-5 bx-5 flex justify-between xl:flex-row flex-col'>
          <h1 className="text-3xl text-center xl:text-6xl xl:mt-0 xl:pl-10">
            {geoData ? `${geoData.name}, ${geoData.state}` : "Loading location..."}
          </h1>

          <div className="max-w-md mx-auto md:mx-0 md:ml-auto ">
            <div className='xl:flex justify-between pr-10 '>
              <div className="flex justify-between items-center   mb-3 xl:mb-0 w-14  mx-auto mt-4 md:mt-0">
                <span className="text-white   text-sm mr-1">°C</span>
                <label htmlFor="toggle" className="inline-flex relative items-center cursor-pointer">
                  <input type="checkbox" id="toggle" className="sr-only peer" checked={isFahrenheit} onChange={handleToggleChange} />
                  <div className="w-12 h-6 bg-blue-500 dark:bg-gray-400 border-blue-300 border-2  rounded-full peer"></div>
                  <span className="m-1 absolute left-0 inline-block w-5 h-5 bg-blue-100 dark:bg-gray-800 border-blue-900 border-2 rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-5 peer-checked:border-blue-600"></span>
                </label>
                <span className="text-white ml-1 text-sm ">°F</span>
              </div>

              <div className='flex'>
                <div className='ml-2'>
                  <button
                    onClick={() => handleToggleCitySave(currentCity)}
                    className="flex items-center justify-center mx-8 w-10 h-10 focus:outline-none"
                    aria-label={savedCities.includes(currentCity) ? "Unsave City" : "Save City"}
                    style={{ backgroundColor: 'transparent' }}
                  >
                    {savedCities.includes(currentCity) ? (
                      // Minus Icon within a Circle for "Unsave"
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="11.5" fill="none" stroke="white" />
                        <path d="M8 12H16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      // Plus Icon within a Circle for "Save"
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="11.5" fill="none" stroke="white" />
                        <path d="M12 8V16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M8 12H16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                </div>
                <div>
                  <div className="relative ">
                    <form onSubmit={handleSearchSubmit}>
                      <input className="w-full bg-blue-500 text-white placeholder-white rounded-md border-0 pl-10 pr-4 py-2" placeholder='Enter a City name'
                        type="text"
                        value={searchQuery}
                        onChange={handleInputChange}
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                        {/* search icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* <WeatherComponent/> */}
        <div className="top-section mx-10 mb-4 bg-blue-500 rounded-2xl">
          {/* Using grid-cols-3 for a 3-column layout but adjusting the content and divider placement */}
          <div className="grid grid-cols-1 md:grid-cols-3 items-center p-10 min-h-[30vh] ">
            {/* Left Column */}
            <div className="md:col-span-1 flex justify-center md:justify-end items-center space-x-4">
              <div className="flex flex-col items-center">

                <p className="text-5xl">{getDayName(new Date())}</p>
                <div className='text-sm p-2'>
                  Local Time: {weatherData && formatTime12Hour(weatherData.timezone)}
                </div>

                <div className="flex items-center">
                  <div className="">
                    {weatherData && weatherData.weather && weatherData.weather.length > 0 ? (
                      <img src={`https://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png`} alt="Weather Icon" />
                    ) : (
                      <div>Loading weather icon...</div> // Placeholder or loading state
                    )}
                  </div>
                  <p className="text-5xl xl:text-8xl">
                    {weatherData && weatherData.main ? `${Math.round(weatherData.main.temp)}°${isFahrenheit ? 'F' : 'C'}` : 'Loading...'}
                  </p>
                </div>

              </div>
            </div>
            {/* Vertical Divider with adjusted margins for proper spacing */}
            <div className="w-px bg-gray-400 h-full mx-auto"></div>

            {/* Right Column */}
            <div className="md:col-span-1 flex justify-center md:justify-start items-center space-x-4">
              <div className="flex flex-col items-center md:items-start space-y-2">
                {weatherData && weatherData.main ? (
                  <>
                    <p className="text-4xl xl:text-5xl p-4">
                      High: {Math.round(weatherData.main.temp_max)}°{isFahrenheit ? 'F' : 'C'}
                    </p>
                    <p className="text-4xl xl:text-5xl p-4">
                      Low: {Math.round(weatherData.main.temp_min)}°{isFahrenheit ? 'F' : 'C'}
                    </p>
                  </>
                ) : (
                  <p>Loading temperature data...</p> // Placeholder for loading state
                )}
              </div>

            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 m-10 min-h-[40vh]">
          {forecastData?.map((forecast, index) => {
            return (
              <div key={index} className="bg-blue-500 rounded-2xl flex flex-col items-center justify-between p-4">
                <p className="text-2xl xl:text-4xl">{new Date(forecast.day).toLocaleDateString('en-US', { weekday: 'long' })}</p>
                <img src={`https://openweathermap.org/img/wn/${forecast.icon}@2x.png`} alt="Weather Icon" className="mb-4" />
                <div>
                  <p className="text-2xl xl:text-4xl">H: {Math.round(forecast.maxTemp)}°{isFahrenheit ? 'F' : 'C'}</p>
                  <p style={{ opacity: 0.6 }} className="text-2xl xl:text-4xl to-transparent ">L: {Math.round(forecast.minTemp)}°{isFahrenheit ? 'F' : 'C'}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>


      <div className='sidebar'>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="absolute top-0 left-0 m-4 p-4 py-2 text-white bg-blue-500 hover:bg-blue-700 rounded-md">Favorites</button>
        {/* Sidebar */}
        {isSidebarOpen && (
          <div className="absolute top-0 left-0 h-full w-64 bg-blue-500 shadow-lg">
            <div className="p-5">
              <h2 className="text-xl mb-3">Favorite Cities</h2>
              <button onClick={() => setIsSidebarOpen(false)} className="px-4 py-2 text-sm text-white bg-red-500 hover:bg-red-700 rounded-md">Close</button>
            </div>
            <ul className="p-5">
              {savedCities.map((city, index) => (
                <li key={index} onClick={() => handleCitySelect(city)} className="py-2 border-b border-gray-200 cursor-pointer">{city}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherComponent;
