import { useCallback, useEffect, useState } from 'react';
import seedCars from '../data/cars.json';
import {
  getCustomCars,
  getAllRecords,
  deleteCustomCar as removeCustomCar,
  getHiddenSeedCars,
  hideSeedCar,
  restoreSeedCar,
  restoreAllSeedCars,
} from './storage';

function mergeCars() {
  const custom = getCustomCars();
  const hidden = new Set(getHiddenSeedCars());
  const seedIds = new Set(seedCars.map((c) => c.id));
  // Custom cars can also override a seed car if the id matches (rare, but keeps edits simple).
  const overrides = custom.filter((c) => seedIds.has(c.id));
  const additions = custom.filter((c) => !seedIds.has(c.id));
  const overrideMap = new Map(overrides.map((c) => [c.id, c]));

  const merged = seedCars.filter((c) => !hidden.has(c.id)).map((c) => overrideMap.get(c.id) || c);
  return [...merged, ...additions];
}

export function useCars() {
  const [cars, setCars] = useState([]);
  const [records, setRecords] = useState({});

  const refresh = useCallback(() => {
    setCars(mergeCars());
    setRecords(getAllRecords());
  }, []);

  useEffect(() => {
    refresh();
    // Keep in sync if data changes in another tab.
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, [refresh]);

  const getCar = useCallback((id) => cars.find((c) => c.id === id), [cars]);

  const isCustom = useCallback((id) => !seedCars.some((c) => c.id === id), [cars]);

  // Custom cars are actually deleted. Seed cars can't be deleted from the
  // bundled JSON, so removing one instead hides it from this browser's garage.
  const removeCar = useCallback(
    (id) => {
      if (seedCars.some((c) => c.id === id)) {
        hideSeedCar(id);
      } else {
        removeCustomCar(id);
      }
      refresh();
    },
    [refresh]
  );

  const hiddenSeedCars = useCallback(() => {
    const hiddenIds = new Set(getHiddenSeedCars());
    return seedCars.filter((c) => hiddenIds.has(c.id));
  }, []);

  const unhideSeedCar = useCallback(
    (id) => {
      restoreSeedCar(id);
      refresh();
    },
    [refresh]
  );

  const unhideAllSeedCars = useCallback(() => {
    restoreAllSeedCars();
    refresh();
  }, [refresh]);

  return { cars, records, refresh, getCar, isCustom, removeCar, hiddenSeedCars, unhideSeedCar, unhideAllSeedCars };
}
