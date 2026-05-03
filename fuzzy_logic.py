import numpy as np
import skfuzzy as fuzz
from skfuzzy import control as ctrl

# 1. Define fuzzy variables
weather = ctrl.Antecedent(np.arange(0, 11, 1), 'weather')
traffic = ctrl.Antecedent(np.arange(0, 11, 1), 'traffic')
delay = ctrl.Consequent(np.arange(1.0, 3.1, 0.1), 'delay')

# 2. Membership functions
weather.automf(3, names=['clear', 'rain', 'storm'])
traffic.automf(3, names=['low', 'medium', 'high'])

delay['none'] = fuzz.trimf(delay.universe, [1.0, 1.0, 1.5])
delay['moderate'] = fuzz.trimf(delay.universe, [1.2, 1.6, 2.0])
delay['severe'] = fuzz.trimf(delay.universe, [1.8, 3.0, 3.0])

# 3. Rules
rule1 = ctrl.Rule(weather['clear'] & traffic['low'], delay['none'])
rule2 = ctrl.Rule(weather['storm'] | traffic['high'], delay['severe'])
rule3 = ctrl.Rule(weather['rain'] & traffic['medium'], delay['moderate'])
rule4 = ctrl.Rule(weather['clear'] & traffic['medium'], delay['none'])
rule5 = ctrl.Rule(weather['rain'] | traffic['high'], delay['severe'])
rule6 = ctrl.Rule(weather['rain'] & traffic['low'], delay['moderate'])

delay_ctrl = ctrl.ControlSystem([rule1, rule2, rule3, rule4, rule5, rule6])
delay_sim = ctrl.ControlSystemSimulation(delay_ctrl)

def calculate_fuzzy_eta(distance, weather_str, traffic_str):
    """
    Computes an ETA based on base distance and fuzzy logic evaluations of conditions.
    """
    # Base ETA (Assuming 50 mph base speed)
    base_hours = distance / 50.0

    # Map linguistic variables to numeric Crisp Inputs (0-10 scale)
    weather_val = 0
    w_lower = weather_str.lower()
    if 'rain' in w_lower: weather_val = 5
    elif 'storm' in w_lower: weather_val = 10
    elif 'snow' in w_lower: weather_val = 8
    elif 'fog' in w_lower: weather_val = 4
    elif 'clear' in w_lower: weather_val = 0

    traffic_val = 0
    t_lower = traffic_str.lower()
    if 'medium' in t_lower: traffic_val = 5
    elif 'high' in t_lower: traffic_val = 8
    elif 'jam' in t_lower: traffic_val = 10
    elif 'low' in t_lower: traffic_val = 0

    delay_sim.input['weather'] = weather_val
    delay_sim.input['traffic'] = traffic_val
    
    try:
        delay_sim.compute()
        multiplier = delay_sim.output['delay']
    except:
        multiplier = 1.0

    final_eta_hours = base_hours * multiplier

    # Formatting time
    days = int(final_eta_hours // 24)
    hours = int(final_eta_hours % 24)
    time_str = ""
    if days > 0: time_str += f"{days} Day(s) "
    if hours > 0 or days == 0: time_str += f"{hours} Hour(s)"

    status = "On Time"
    if multiplier > 1.3: status = "Expected Delay"
    if multiplier > 1.8: status = "Significant Delay"

    return {
        "etaHours": round(final_eta_hours, 1),
        "etaFormatted": time_str.strip() or "Less than an hour",
        "fuzzyStatus": status,
        "conditionFactors": {
            "multiplier": round(multiplier, 2)
        }
    }
