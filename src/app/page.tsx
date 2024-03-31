
'use client'


import WeatherComponent from "./components/WeatherComponent";

import { SavedCitiesProvider } from "./contexts/SavedCitiesContext";


export default function Home() {
  return (
    <>
    <SavedCitiesProvider>
    <WeatherComponent/> 
    </SavedCitiesProvider>
     
    </>
  );
}
