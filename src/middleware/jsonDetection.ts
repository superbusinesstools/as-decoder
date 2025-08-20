import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to handle JSON content sent with incorrect Content-Type headers.
 * This fixes the issue where Twenty sends JSON data with 
 * Content-Type: application/x-www-form-urlencoded
 * 
 * TODO: Remove this middleware once Twenty fixes their webhook Content-Type headers
 * or implement a more robust solution for handling multiple content types
 */
export function jsonDetectionMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const contentType = req.get('Content-Type') || '';
  
  // For form-urlencoded content type that might contain JSON, convert to JSON content type
  if (contentType.includes('application/x-www-form-urlencoded')) {
    console.log('🔧 Twenty webhook detected: Converting form-urlencoded to JSON parsing');
    req.headers['content-type'] = 'application/json';
  }
  
  next();
}