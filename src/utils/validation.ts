import Joi from 'joi';
import { CompanyQueueRequest } from '../types';

export const companyQueueSchema = Joi.object<CompanyQueueRequest>({
  company_id: Joi.string()
    .trim()
    .min(1)
    .max(255)
    .required()
    .messages({
      'string.empty': 'company_id is required',
      'string.max': 'company_id must be less than 255 characters',
      'any.required': 'company_id is required'
    }),
  
  website_url: Joi.string()
    .trim()
    .uri({ scheme: ['http', 'https'] })
    .required()
    .messages({
      'string.empty': 'website_url is required',
      'string.uri': 'website_url must be a valid URL',
      'any.required': 'website_url is required'
    }),
  
  source_url: Joi.string()
    .allow('', null)
    .optional()
    .custom((value, helpers) => {
      if (!value || value.trim() === '') {
        return value; // Allow empty/null values
      }
      // For non-empty values, validate as URI
      const uriSchema = Joi.string().uri({ scheme: ['http', 'https'] });
      const { error } = uriSchema.validate(value.trim());
      if (error) {
        return helpers.error('string.uri');
      }
      return value.trim();
    })
    .messages({
      'string.uri': 'source_url must be a valid URL'
    })
});

export function validateCompanyQueue(data: unknown): { error?: string; value?: CompanyQueueRequest } {
  const result = companyQueueSchema.validate(data, { 
    abortEarly: false,
    stripUnknown: true 
  });
  
  if (result.error) {
    const errors = result.error.details.map(detail => detail.message).join(', ');
    return { error: errors };
  }
  
  return { value: result.value };
}