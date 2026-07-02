import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';

export class SnakeNamingStrategy
  extends DefaultNamingStrategy
  implements NamingStrategyInterface
{
  tableName(targetName: string, userSpecifiedName: string | undefined): string {
    return userSpecifiedName ?? targetName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  }

  columnName(propertyName: string, customName: string | undefined): string {
    return customName ?? propertyName.replace(/([A-Z])/g, '_$1').toLowerCase();
  }

  relationName(propertyName: string): string {
    return propertyName.replace(/([A-Z])/g, '_$1').toLowerCase();
  }

  joinColumnName(relationName: string, referencedColumnName: string): string {
    return `${this.columnName(relationName, undefined)}_${referencedColumnName}`;
  }

  joinTableName(firstTableName: string, secondTableName: string): string {
    return `${firstTableName}_${secondTableName}`;
  }

  joinTableColumnName(tableName: string, propertyName: string, columnName?: string): string {
    return `${tableName}_${columnName ?? this.columnName(propertyName, undefined)}`;
  }
}