import { injectable } from "tsyringe";
import * as git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import { promises as fsPromises } from 'fs';
import { join } from 'path';
import * as crypto from 'crypto';

@injectable()
export class LicenseVerifier {
    public async verifyLicense(url: string): Promise<boolean> {
        if (!url.startsWith('https://')) {
            url = `https://${url}`;
        }
        
        const uniqueId = crypto.createHash('md5').update(url).digest('hex');
        const dirPath = `./tmp_repo_${uniqueId}`;
        
        try {
            await git.clone({
                fs: require('fs'),
                http,
                dir: dirPath,
                url: `${url}.git`,
                singleBranch: true,
                depth: 1,
            });

            let readmeText: string | null = null;
            let licenseFileText: string | null = null;
            
            // Read README.md
            try {
                readmeText = await fsPromises.readFile(join(dirPath, 'README.md'), 'utf8');
            } catch (error) {
                // Handle error if needed
            }
            
            // Read LICENSE file if available
            try {
                licenseFileText = await fsPromises.readFile(join(dirPath, 'LICENSE'), 'utf8');
            } catch (error) {
                // Handle error if needed
            }

            const compatibleLicenses = [
                'MIT', 'BSD', 'Apache 2.0', 'Zlib',
                'ISC', 'Artistic 2.0', 'Python Software Foundation',
                'Public Domain', 'Mozilla Public License 2.0',
                'GNU General Public License v2 or later',
                'GNU Lesser General Public License v2.1 or later'
            ];

            const searchInText = (text: string | null) => {
                for (const lic of compatibleLicenses) {
                    const licenseRegExp = new RegExp(lic, 'i');
                    if (text && licenseRegExp.test(text)) {
                        return true;
                    }
                }
                return false;
            };

            // Check for licenses in README and LICENSE
            return searchInText(readmeText) || searchInText(licenseFileText);

        } catch (error) {
            console.error('An error occurred:', error);
            return false;
        } finally {
            // Cleanup
            await this.deleteDirectory(dirPath);
        }
    }

    private async deleteDirectory(dir: string): Promise<void> {
        const entries = await fsPromises.readdir(dir, { withFileTypes: true });
        await Promise.all(entries.map(entry => {
            const fullPath = join(dir, entry.name);
            return entry.isDirectory() ? this.deleteDirectory(fullPath) : fsPromises.unlink(fullPath);
        }));
        await fsPromises.rmdir(dir);
    }
}
