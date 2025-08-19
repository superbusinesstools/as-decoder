import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  authenticated?: boolean;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authToken = process.env.AUTH_TOKEN;
  
  // If no AUTH_TOKEN is set, allow all requests (backwards compatibility)
  if (!authToken || authToken === 'change-this-to-your-secure-token') {
    req.authenticated = true;
    next();
    return;
  }

  // Check for token in various places
  const token = 
    req.headers['x-auth-token'] as string ||
    req.headers['authorization']?.replace('Bearer ', '') ||
    req.query.token as string;

  if (token === authToken) {
    req.authenticated = true;
    next();
  } else {
    res.status(401).json({ 
      success: false, 
      error: 'Unauthorized. Please provide a valid auth token.' 
    });
  }
}

// Middleware for status page that returns HTML login form instead of JSON
export function authPageMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authToken = process.env.AUTH_TOKEN;
  
  // If no AUTH_TOKEN is set, allow all requests
  if (!authToken || authToken === 'change-this-to-your-secure-token') {
    req.authenticated = true;
    next();
    return;
  }

  // Check for token in cookie or query
  const token = req.query.token as string;

  if (token === authToken) {
    req.authenticated = true;
    next();
  } else {
    // Return login page
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AS-Decoder Login</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen">
    <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 class="text-2xl font-bold mb-6 text-center">AS-Decoder Login</h2>
        <form id="loginForm" class="space-y-4">
            <div>
                <label for="token" class="block text-sm font-medium text-gray-700 mb-2">
                    Auth Token
                </label>
                <input 
                    type="password" 
                    id="token" 
                    name="token"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your auth token"
                    required
                >
            </div>
            <button 
                type="submit"
                class="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition duration-200"
            >
                Login
            </button>
            <div id="error" class="text-red-500 text-sm hidden"></div>
        </form>
    </div>
    <script>
        document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const token = document.getElementById('token').value;
            
            // Store token in localStorage
            localStorage.setItem('authToken', token);
            
            // Redirect with token
            window.location.href = '/status.html?token=' + encodeURIComponent(token);
        });
        
        // Check if we have a token in localStorage
        const storedToken = localStorage.getItem('authToken');
        if (storedToken) {
            window.location.href = '/status.html?token=' + encodeURIComponent(storedToken);
        }
    </script>
</body>
</html>
    `);
  }
}