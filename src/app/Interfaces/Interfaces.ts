// interfaces for the API responses
export interface WeatherData {
    main: {
      temp: number;
      temp_min: number;
      temp_max: number;
    };
    name: string; 
  
    weather: {
      icon: string;
    }[];
    timezone: number;
  }
  
  export  interface GeoData {
    name: string;
    state: string;
  }
  
  export interface ForecastData {
    list: {
      dt: number;
      main: {
        temp_max: number;
        temp_min: number;
      };
      weather: [{ icon: string }];
    }[];
    city: {
      timezone: number;
    };
  }
  
  export interface DailyForecast {
    day: string; // 'YYYY-MM-DD' format
    maxTemp: number;
    minTemp: number;
    icon: string;
  }