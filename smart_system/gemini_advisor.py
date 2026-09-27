import os
from google import genai

CANDIDATE_MODELS = ['gemini-3-flash-preview', 'gemini-flash-latest']

def generate_crop_advice(input_data: dict, prediction: dict) -> str:
    """
    Generates agricultural advice using the Gemini AI API.
    
    Args:
        input_data (dict): The soil and weather parameters (N, P, K, temperature, humidity, ph, rainfall).
        prediction (dict): The ML prediction results including top_crop and alternatives.
        
    Returns:
        str: The generated advice text, or a fallback message if the API fails or is not configured.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return "AI advice temporarily unavailable. Please configure the GEMINI_API_KEY."

    try:
        client = genai.Client(api_key=api_key)
        
        prompt = f"""
        You are an agricultural expert AI.

        Soil and Climate Data:
        Nitrogen: {input_data.get('N')} kg/ha
        Phosphorus: {input_data.get('P')} kg/ha
        Potassium: {input_data.get('K')} kg/ha
        Temperature: {input_data.get('temperature')} °C
        Humidity: {input_data.get('humidity')} %
        pH: {input_data.get('ph')}
        Rainfall: {input_data.get('rainfall')} mm

        Machine Learning Prediction:
        Recommended Crop: {prediction.get('top_crop')}
        Alternatives: {', '.join(prediction.get('alternatives', []))}

        Explain briefly:
        1. Why the recommended crop fits the soil/climate.
        2. Why the alternatives are viable.
        3. One key action to maximize yield.
        
        CRITICAL: Provide your answer as exactly 3 very short, concise bullet points. Do not include any introductory or concluding text. Maximum 3 sentences total.
        """
        
        last_error = None
        for model_name in CANDIDATE_MODELS:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt
                )
                if response and response.text:
                    return response.text.strip()
            except Exception as me:
                last_error = me
                continue
                
        raise last_error or RuntimeError("All candidate models failed")
        
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return "AI advice temporarily unavailable. (Service Error)"

