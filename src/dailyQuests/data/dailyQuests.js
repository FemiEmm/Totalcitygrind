function quest(id, group, title, description, eventType, target, reward) {
  return Object.freeze({ id, group, title, description, eventType, target, reward });
}

export const DAILY_QUEST_DEFINITIONS = Object.freeze([
  quest("daily-route-one", "driving", "One more trip", "Complete 1 paid route today.", "route-completed", 1, 1200),
  quest("daily-route-two", "driving", "Keep the wheels turning", "Complete 2 paid routes today.", "route-completed", 2, 2200),
  quest("daily-route-three", "driving", "Route marathon", "Complete 3 paid routes today.", "route-completed", 3, 3500),
  quest("daily-clean-route", "driving", "Clean run", "Complete a route without a collision or traffic violation.", "clean-route-completed", 1, 2500),
  quest("daily-clean-routes-two", "driving", "Professional driver", "Complete 2 clean routes today.", "clean-route-completed", 2, 4200),
  quest("daily-danfo-route", "driving", "Danfo duty", "Complete 1 Danfo route today.", "danfo-route-completed", 1, 1800),
  quest("daily-danfo-routes-two", "driving", "Danfo double", "Complete 2 Danfo routes today.", "danfo-route-completed", 2, 3200),
  quest("daily-brt-route", "driving", "BRT shift", "Complete 1 BRT service today.", "brt-route-completed", 1, 2500),
  quest("daily-brt-routes-two", "driving", "BRT overtime", "Complete 2 BRT services today.", "brt-route-completed", 2, 4500),
  quest("daily-night-route", "driving", "Night operator", "Complete 1 route after 6 PM.", "night-route-completed", 1, 3000),

  quest("daily-earn-5000", "earnings", "Daily bread", "Earn ₦5,000 today.", "income-earned", 5000, 1000),
  quest("daily-earn-10000", "earnings", "Good business", "Earn ₦10,000 today.", "income-earned", 10000, 1800),
  quest("daily-earn-15000", "earnings", "Strong shift", "Earn ₦15,000 today.", "income-earned", 15000, 2500),
  quest("daily-earn-20000", "earnings", "Serious hustle", "Earn ₦20,000 today.", "income-earned", 20000, 3200),
  quest("daily-earn-30000", "earnings", "Big day", "Earn ₦30,000 today.", "income-earned", 30000, 5000),
  quest("daily-passengers-10", "earnings", "Fill some seats", "Board 10 passengers today.", "passenger-boarded", 10, 1200),
  quest("daily-passengers-20", "earnings", "Busy conductor", "Board 20 passengers today.", "passenger-boarded", 20, 2200),
  quest("daily-passengers-35", "earnings", "Packed service", "Board 35 passengers today.", "passenger-boarded", 35, 3500),
  quest("daily-brt-passengers-20", "earnings", "BRT crowd", "Board 20 BRT passengers today.", "brt-passenger-boarded", 20, 2800),
  quest("daily-danfo-passengers-14", "earnings", "Full Danfo", "Board 14 Danfo passengers today.", "danfo-passenger-boarded", 14, 2200),

  quest("daily-start-engine", "routine", "Start the day", "Start a vehicle engine today.", "engine-started", 1, 600),
  quest("daily-pick-route", "routine", "Make a plan", "Choose a paid route today.", "route-selected", 1, 600),
  quest("daily-return-home", "routine", "Back to base", "Return to your home parking space.", "home-arrived", 1, 1200),
  quest("daily-sleep-home", "routine", "Proper rest", "Sleep at home after your shift.", "slept-at-home", 1, 1200),
  quest("daily-refuel", "routine", "Keep it fuelled", "Refuel a vehicle when fuel is low.", "low-fuel-refuelled", 1, 1000),
  quest("daily-repair", "routine", "Roadworthy", "Repair vehicle damage today.", "vehicle-repaired", 1, 1400),
  quest("daily-eat", "routine", "Eat something", "Restore your energy with food.", "energy-restored", 1, 800),
  quest("daily-health", "routine", "Look after yourself", "Restore your health today.", "health-restored", 1, 1000),
  quest("daily-clear-fines", "routine", "Clear your record", "Pay all outstanding traffic fines.", "fines-cleared", 1, 1800),
  quest("daily-safe-energy", "routine", "Finish strong", "Complete a route with at least 25% energy.", "energy-safe-route-completed", 1, 1500),
]);