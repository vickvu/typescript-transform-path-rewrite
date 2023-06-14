import type { Processor } from './processor';
import { AsyncImportProcessor } from './async-import-processor';
import { ExportProcessor } from './export-processor';
import { ImportProcessor } from './import-processor';
import { ImportRequireProcessor } from './import-require-processor';
import { ImportTypeProcessor } from './import-type-processor';
import { RequireProcessor } from './require-processor';

export type { Processor };
export function createProcessors(...args: ConstructorParameters<typeof Processor>): Processor[] {
    return [
        new AsyncImportProcessor(...args),
        new ExportProcessor(...args),
        new ImportProcessor(...args),
        new ImportRequireProcessor(...args),
        new ImportTypeProcessor(...args),
        new RequireProcessor(...args),
    ];
}
