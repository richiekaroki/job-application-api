import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isUnsafeUrl } from './ssrf.validator';

@ValidatorConstraint({ name: 'isNotPrivateUrl', async: false })
export class IsNotPrivateUrlConstraint implements ValidatorConstraintInterface {
  validate(url: string): boolean {
    return !isUnsafeUrl(url);
  }

  defaultMessage(): string {
    return 'URL points to a private or restricted network address';
  }
}

export function IsNotPrivateUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNotPrivateUrl',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsNotPrivateUrlConstraint,
    });
  };
}
