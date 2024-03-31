



export const getDayName = (date: Date) => {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return dayNames[date.getDay()];
  };

  export const formatTime12Hour = (timezoneOffsetInSeconds: number) => {
    // Create a new Date object for the current time
    const now = new Date();

    // Calculate the local time based on the timezone offset
    // Note: The timezone offset from the API is in seconds, JavaScript Date uses milliseconds
    const localTime = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + timezoneOffsetInSeconds * 1000);

    let hours = localTime.getHours();
    const minutes = localTime.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours || 12; // the hour '0' should be '12'
    const minutesStr = minutes < 10 ? `0${minutes}` : minutes.toString();

    return `${hours}:${minutesStr} ${ampm}`;
  };




  
